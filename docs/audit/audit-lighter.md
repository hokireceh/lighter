# Audit Laporan — Lighter DEX Engine
**Tanggal:** 2026-04-11  
**Auditor:** Agent (berdasarkan review kode statis)  
**Status:** DRAFT — belum ada fix, menunggu persetujuan  

---

## Scope File

| File | Baris |
|---|---|
| `artifacts/api-server/src/lib/botEngine.ts` | 1–1350 |
| `artifacts/api-server/src/lib/lighterApi.ts` | 1–681 |
| `artifacts/api-server/src/lib/lighterWs.ts` | 1–193 |
| `artifacts/api-server/src/lib/marketCache.ts` | 1–88 |
| `artifacts/api-server/src/lib/lighterSigner.ts` | 1–259 |
| `artifacts/api-server/src/lib/autoRerange.ts` | 1–531 |
| `artifacts/api-server/src/routes/bot.ts` | 1–266 |

---

## Ringkasan Executive

| Severity | Jumlah |
|---|---|
| CRITICAL | 1 |
| HIGH | 4 |
| MEDIUM | 4 |
| LOW | 2 |
| COSMETIC | 2 |
| CLOSED (false positive) | 1 |
| **Total** | **14** |

---

## Temuan Detail

---

### LIGHTER-BOT-001
**Severity:** CRITICAL  
**Kategori:** Race Condition — Start/Stop Concurrent  
**File:** `artifacts/api-server/src/lib/botEngine.ts`  
**Baris:** 959–960  

#### Kode Bermasalah
```typescript
export async function startBot(strategyId: number): Promise<boolean> {
  if (runningBots.has(strategyId)) return true;
  // ... async DB calls happen here (200–500ms) ...
```

#### Dampak Nyata
`startBot` adalah `async` function. Guard `runningBots.has(strategyId)` hanya mencegah double-start jika bot sudah SELESAI di-start. Antara cek `has()` dan saat `runningBots.set(...)` dipanggil (baris 1066), ada jeda async selama ratusan milidetik (query DB, getBotConfig, registerPriceCallback, dll).

Jika dua request `/bot/start/:strategyId` masuk hampir bersamaan (atau `restoreRunningBots` menghitung strategi yang sama dua kali), keduanya lolos guard → dua timer `setInterval` berjalan → dua WS callback terdaftar → **order duplikat** dikirim setiap tick. Ini menyebabkan kerugian finansial langsung.

Tidak ada `startingBots = new Set<number>()` untuk menutup window ini.

#### Diff Fix yang Direkomendasikan
```diff
+const startingBots = new Set<number>();

 export async function startBot(strategyId: number): Promise<boolean> {
   if (runningBots.has(strategyId)) return true;
+  if (startingBots.has(strategyId)) return true;
+  startingBots.add(strategyId);
+  try {
     // ... semua logic start bot ...
     runningBots.set(strategyId, { strategyId, timer, nextRunAt });
     // ...
     return true;
+  } finally {
+    startingBots.delete(strategyId);
+  }
 }
```

---

### LIGHTER-BOT-002
**Severity:** ~~CRITICAL~~ → **CLOSED — FALSE POSITIVE**  
**Kategori:** WebSocket — Channel Parsing  
**File:** `artifacts/api-server/src/lib/lighterWs.ts`  
**Baris:** 41 (subscribe), 105 (parse)  
**Diverifikasi:** 2026-04-11 dari `referensi/lighter-docs/docs/websocket.md`

#### Hasil Verifikasi

Lighter WS menggunakan format **asimetris** yang terdokumentasi resmi:

| Arah | Format | Contoh |
|---|---|---|
| Subscribe (client → server) | `ticker/MARKET_INDEX` (slash) | `"ticker/0"` |
| Response (server → client) | `ticker:MARKET_INDEX` (colon) | `"ticker:0"` |

Dikonfirmasi oleh contoh respons aktual di docs:
```json
{ "channel": "ticker:0", "type": "update/ticker" }
```

Kode existing **sudah benar**:
- Baris 41: subscribe dengan slash ✅
- Baris 105: parse response dengan `split(":")` ✅

**Tidak ada bug. Tidak ada fix diperlukan.**

---

### LIGHTER-BOT-003
**Severity:** HIGH  
**Kategori:** SL/TP — Operator Comparison, Edge Case  
**File:** `artifacts/api-server/src/lib/botEngine.ts`  
**Baris:** 748, 763  

#### Kode Bermasalah
```typescript
// Baris 748:
if (config.stopLoss && currentPrice.lt(config.stopLoss)) {

// Baris 763:
if (config.takeProfit && currentPrice.gt(config.takeProfit)) {
```

#### Dampak Nyata
Pemeriksaan `config.stopLoss` menggunakan **truthy check** JavaScript, bukan `!= null`. Ini berarti:

1. Jika `stopLoss = 0` (harga tidak valid tapi mungkin datang dari DB yang corrupt atau default), SL tidak akan pernah trigger — bot tidak akan berhenti meski harga crash ke 0.
2. Lebih penting: jika `stopLoss = null` (user tidak set SL), ini aman. Tapi jika `stopLoss = 0.0001` (angka sangat kecil tapi truthy), ini akan trigger dengan benar. Jadi bug ini spesifik untuk `stopLoss === 0`.
3. **Inkonsistensi dengan autoRerange.ts**: Di `computeNewSlTp()` (baris 159), SL diperiksa dengan `oldSL !== null` — ini benar. Dua file menggunakan konvensi yang berbeda.

Risiko nyata: jika ada path di UI atau DB migration yang menyimpan `0` sebagai nilai default SL/TP (bukan `null`), SL/TP tidak akan pernah trigger.

#### Diff Fix yang Direkomendasikan
```diff
-if (config.stopLoss && currentPrice.lt(config.stopLoss)) {
+if (config.stopLoss != null && config.stopLoss > 0 && currentPrice.lt(config.stopLoss)) {

-if (config.takeProfit && currentPrice.gt(config.takeProfit)) {
+if (config.takeProfit != null && config.takeProfit > 0 && currentPrice.gt(config.takeProfit)) {
```

---

### LIGHTER-BOT-004
**Severity:** HIGH  
**Kategori:** DCA Logic — maxOrders Tidak Pernah Di-enforce  
**File:** `artifacts/api-server/src/lib/botEngine.ts`  
**Baris:** 197–204 (type definition), 196–274 (executeDcaOrder)  

#### Kode Bermasalah
```typescript
// Baris 197–204: maxOrders ada di type definition
const config = strategy.dcaConfig as {
  amountPerOrder: number;
  intervalMinutes: number;
  side: "buy" | "sell";
  orderType: "market" | "limit" | "post_only";
  maxOrders?: number;  // <-- DEKLARASI ADA
  limitPriceOffset?: number;
};

// executeDcaOrder (baris 196-274): maxOrders TIDAK PERNAH DIBACA
// Tidak ada: if (config.maxOrders && executedOrders >= config.maxOrders) return;
```

#### Dampak Nyata
User dapat mengkonfigurasi `maxOrders: 10` di UI untuk membatasi total order DCA. Field ini disimpan di `dcaConfig` JSON tapi tidak pernah dibaca saat eksekusi. Bot akan terus menempatkan order tanpa batas, menghabiskan modal user melebihi yang direncanakan.

Untuk menegakkan ini, jumlah order yang sudah dieksekusi perlu di-query dari `tradesTable` (sudah ada kolom `strategyId`) sebelum setiap eksekusi DCA.

#### Diff Fix yang Direkomendasikan
```diff
 async function executeDcaOrder(strategy: ...) {
   const config = strategy.dcaConfig as { ...; maxOrders?: number; ... };
   if (!config) return;

+  // Enforce maxOrders cap
+  if (config.maxOrders && config.maxOrders > 0) {
+    const executedCount = await db.select({ count: sql<number>`count(*)::int` })
+      .from(tradesTable)
+      .where(and(eq(tradesTable.strategyId, strategy.id), eq(tradesTable.status, "filled")));
+    if ((executedCount[0]?.count ?? 0) >= config.maxOrders) {
+      await addLog(userId, strategy.id, strategy.name, "info",
+        `DCA: maxOrders (${config.maxOrders}) tercapai, bot dihentikan`);
+      await stopBot(strategy.id);
+      return;
+    }
+  }
```

---

### LIGHTER-BOT-005
**Severity:** HIGH  
**Kategori:** DCA Logic — Interval Tidak Beradaptasi Setelah Config Update  
**File:** `artifacts/api-server/src/lib/botEngine.ts`  
**Baris:** 1025–1027, 1055–1064  

#### Kode Bermasalah
```typescript
// Baris 1025–1027: intervalMs dihitung SEKALI saat startBot
const intervalMs = strategy.type === "dca"
  ? ((strategy.dcaConfig as { intervalMinutes?: number })?.intervalMinutes ?? 60) * 60 * 1000
  : GRID_FALLBACK_INTERVAL_MS;

// Baris 1055–1064: setInterval menggunakan intervalMs yang sudah fix
const timer = setInterval(async () => {
  const bot = runningBots.get(strategyId);
  if (bot) {
    const nextInterval = strategy.type === "dca"
      ? ((strategy.dcaConfig as { intervalMinutes?: number })?.intervalMinutes ?? 60) * 60 * 1000
      : GRID_FALLBACK_INTERVAL_MS;  // <- ini membaca strategy snapshot, BUKAN dari DB terbaru
    bot.nextRunAt = new Date(Date.now() + nextInterval);
  }
  await runStrategyOnce(strategyId);
}, intervalMs);  // <- interval timer SUDAH FIX tidak bisa berubah
```

#### Dampak Nyata
`setInterval(callback, intervalMs)` adalah timer yang periode-nya tidak bisa diubah setelah dibuat. Jika user mengubah `intervalMinutes` dari 60 → 30 menit via UI, bot yang sedang berjalan akan tetap menjalankan order setiap 60 menit hingga di-restart. Tampilan `nextRunAt` di dashboard juga salah (karena menggunakan `strategy` snapshot dari waktu `startBot`, bukan nilai DB terbaru).

`runStrategyOnce` memang fetch strategy dari DB ulang di setiap eksekusi (baris 932), jadi order execution menggunakan config terbaru — tetapi **frekuensi** eksekusi tetap menggunakan interval lama.

#### Diff Fix yang Direkomendasikan
Ganti `setInterval` dengan `setTimeout` rekursif yang membaca interval dari DB setiap siklus:

```diff
-const timer = setInterval(async () => {
-  const bot = runningBots.get(strategyId);
-  if (bot) {
-    const nextInterval = ...;
-    bot.nextRunAt = new Date(Date.now() + nextInterval);
-  }
-  await runStrategyOnce(strategyId);
-}, intervalMs);
+
+async function scheduleNext(stratId: number) {
+  const strat = await db.query.strategiesTable.findFirst({ where: eq(strategiesTable.id, stratId) });
+  if (!strat || !runningBots.has(stratId)) return;
+  const nextMs = strat.type === "dca"
+    ? ((strat.dcaConfig as any)?.intervalMinutes ?? 60) * 60 * 1000
+    : GRID_FALLBACK_INTERVAL_MS;
+  const bot = runningBots.get(stratId);
+  if (bot) bot.nextRunAt = new Date(Date.now() + nextMs);
+  const t = setTimeout(async () => {
+    await runStrategyOnce(stratId);
+    await scheduleNext(stratId);
+  }, nextMs);
+  // Store timer ref so stopBot can clearTimeout
+  if (bot) (bot as any).timer = t;
+}
+scheduleNext(strategyId);
+const timer = setTimeout(() => {}, 0); // placeholder — real timer set in scheduleNext
```
> **Catatan:** Perlu refactor interface `RunningBot.timer` dari `NodeJS.Timeout` ke union type, dan `stopBot` perlu menggunakan `clearTimeout` (sudah kompatibel karena `clearInterval`/`clearTimeout` keduanya valid untuk handle yang sama di Node.js).

---

### LIGHTER-BOT-006
**Severity:** HIGH  
**Kategori:** State Management — gridLastLevel Tidak Dipersist ke DB  
**File:** `artifacts/api-server/src/lib/botEngine.ts`  
**Baris:** 41–42 (deklarasi), 806–817 (init), 845–846 (update)  

#### Kode Bermasalah
```typescript
// Baris 41–42: in-memory only
const gridStates = new Map<number, GridState>();

// Baris 806–817: inisialisasi state baru
if (!existingState) {
  gridStates.set(strategy.id, { lastLevel: currentLevel, initializedAt: new Date() });
  // ... return, tidak ada order
  return;
}

// Baris 845–846: update state in-memory
existingState.lastLevel = currentLevel;
```

#### Dampak Nyata
Setelah server restart (deploy baru, crash, atau OOM kill), `gridStates` kosong. `restoreRunningBots` memanggil `startBot` untuk semua strategi yang `isRunning: true`. Pada price tick pertama setelah restart, grid state diinisialisasi di level A. Pada tick kedua, jika harga sudah bergerak dari level A ke level B (yang mungkin terjadi karena ada jeda restart 30–60 detik), bot akan menghitung `levelsMoved = B - A` dan menempatkan order.

Namun ini adalah perilaku yang **SALAH** karena:
- Level A adalah level saat restart, bukan level terakhir sebelum crash
- Seharusnya level yang digunakan adalah level terakhir sebelum crash
- Bot mungkin melewatkan crossing yang terjadi SELAMA server mati
- Atau bot mungkin mengirim order di level yang sudah dikerjakan sebelum crash (beli dua kali di level yang sama)

#### Diff Fix yang Direkomendasikan
Tambah kolom `grid_last_level` di tabel `strategies`:

```typescript
// Di DB schema (db/src/schema/strategies.ts):
gridLastLevel: integer("grid_last_level"),

// Di botEngine.ts, ganti in-memory state save:
// SEBELUM:
existingState.lastLevel = currentLevel;

// SESUDAH:
existingState.lastLevel = currentLevel;
await db.update(strategiesTable)
  .set({ gridLastLevel: currentLevel, updatedAt: new Date() })
  .where(eq(strategiesTable.id, strategy.id));

// Di startBot, restore dari DB:
const restoredLevel = strategy.gridLastLevel;
if (restoredLevel != null) {
  gridStates.set(strategyId, { lastLevel: restoredLevel, initializedAt: new Date() });
}
```

---

### LIGHTER-BOT-007
**Severity:** MEDIUM  
**Kategori:** Grid Logic — Batch Orders Semua Menggunakan Harga yang Sama  
**File:** `artifacts/api-server/src/lib/botEngine.ts`  
**Baris:** 860–927 (executeGridCheck), 603–624 (executeBatchLiveOrders)  

#### Kode Bermasalah
```typescript
// Baris 860–861: harga satu untuk semua
const orderCount = Math.min(Math.abs(levelsMoved), MAX_BATCH_ORDERS);
const size = amountPerGrid.div(currentPrice);

// Baris 914–928: executeBatchLiveOrders dipanggil dengan currentPrice tunggal
await executeBatchLiveOrders({
  ...
  currentPrice,      // <- harga SAMA untuk semua orderCount orders
  orderCount,
  ...
});

// Di executeBatchLiveOrders (baris 603–624): semua order di-sign dengan priceInt sama
const priceInt = toPriceInt(executionPrice.toNumber(), priceDecimals);
for (let i = 0; i < orderCount; i++) {
  const signResult = signCreateOrder({
    ...
    price: priceInt,  // <- sama untuk semua
    ...
  });
}
```

#### Dampak Nyata
Ketika harga melompat 3 level sekaligus (misalnya dari level 5 ke level 2), bot mengirim 3 order BUY semuanya di harga `currentPrice` yang sama (level 2). Padahal seharusnya ada order di level 4, 3, dan 2 dengan harga masing-masing level.

Untuk grid **market orders**: dampak minimal karena IOC mengisi di harga pasar.
Untuk grid **limit orders**: ketiga order sit di book pada harga yang sama → menghabiskan orderbook quota 3x di satu level, bukan menyebar ke 3 level berbeda → strategi grid sama sekali tidak efektif untuk multi-level crossing.

#### Diff Fix yang Direkomendasikan
```diff
// Di executeGridCheck, saat multi-level crossing untuk limit orders:
const orderPrices: Decimal[] = [];
const crossedLevels = Array.from({ length: orderCount }, (_, i) =>
  direction === "down" ? lastLevel - i : lastLevel + i + 1
);
for (const lvl of crossedLevels) {
  const levelPrice = lower.add(gridSpacing.mul(lvl));
  orderPrices.push(levelPrice);
}
// Kirim setiap order dengan harga level masing-masing (sequential, bukan batch)
```
> **Catatan:** Untuk market orders, harga tidak relevan (IOC fill at market), jadi tidak perlu spreading. Perlu dibedakan per `orderKind`.

---

### LIGHTER-BOT-008
**Severity:** MEDIUM  
**Kategori:** Error Handling — sendTx Retries Non-Retryable Errors  
**File:** `artifacts/api-server/src/lib/lighterApi.ts`  
**Baris:** 376–431  

#### Kode Bermasalah
```typescript
for (let attempt = 0; attempt < LIGHTER_MAX_RETRIES; attempt++) {
  // ...
  if (res.status === 429) {
    // retry dengan backoff — BENAR
    await sleep(waitMs); continue;
  }

  if (!res.ok) {
    throw new Error(`sendTx failed (HTTP ${res.status}): ...`);
    // <- LANGSUNG THROW, tidak di-retry untuk non-429 HTTP errors
  }

  if (data.code !== undefined && data.code !== 200 && data.code !== 0) {
    throw new Error(`sendTx rejected by sequencer (code ${data.code}): ...`);
    // <- LANGSUNG THROW untuk sequencer rejections
  }

  return data;
}
// TAPI: lighterFetch (yang dipanggil dari fungsi lain) me-retry SEMUA errors:
// termasuk 400 Bad Request, 403 Forbidden, 500 Internal Server Error
```

#### Dampak Nyata
Di `lighterFetch` (baris 27–68), retry loop me-retry **semua** error non-429 juga karena `catch(err)` pada network error di baris 43–46 kemudian `continue` ke attempt berikutnya. Network errors (AbortError timeout) di-throw, tapi HTTP errors non-429 juga di-throw yang membuat retry loop ke atas untuk attempt berikutnya.

Khususnya: jika signing menghasilkan signature yang invalid (400), atau account insufficient margin (sequencer code 21508), `lighterFetch` akan tetap mencoba 3x dengan delay 2s + 4s = 6+ detik tambahan sebelum akhirnya gagal. Ini memblokir bot engine selama 6+ detik per gagal.

Lebih serius: **double-spend risk** jika Lighter menerima tx (HTTP 200) tapi kode body menunjukkan partial success — saat ini tidak ada guard untuk ini.

#### Diff Fix yang Direkomendasikan
```diff
 for (let attempt = 0; attempt < LIGHTER_MAX_RETRIES; attempt++) {
   // ...
   if (res.status === 429) { /* retry — correct */ }
+  // Non-retryable client errors (4xx except 429): throw immediately
+  if (res.status >= 400 && res.status < 500 && res.status !== 429) {
+    throw new Error(`sendTx failed (HTTP ${res.status}): ${data.error ?? data.message}`);
+  }
+  // Server errors (5xx): retry
   if (!res.ok) {
-    throw new Error(`sendTx failed...`);
+    if (attempt < LIGHTER_MAX_RETRIES - 1) { await sleep(2000 * Math.pow(2, attempt)); continue; }
+    throw new Error(`sendTx failed (HTTP ${res.status}): ${data.error ?? data.message}`);
   }
```

---

### LIGHTER-BOT-009
**Severity:** MEDIUM  
**Kategori:** State Management — pollPendingTrades Bisa Overlap  
**File:** `artifacts/api-server/src/lib/botEngine.ts`  
**Baris:** 1183–1184, 1186–1344, 1346–1349  

#### Kode Bermasalah
```typescript
// Baris 1183:
const TRADE_POLL_INTERVAL_MS = 5_000;

// Baris 1346–1349:
export function startTradePollSchedule() {
  setInterval(pollPendingTrades, TRADE_POLL_INTERVAL_MS);
}

// pollPendingTrades tidak ada guard untuk concurrent execution
// Jika ada 50 pending trades dan setiap getTx() memakan 2-3 detik,
// total waktu eksekusi bisa > 5 detik → interval berikutnya fires sebelum selesai
```

#### Dampak Nyata
`setInterval` fires setiap 5 detik tanpa peduli apakah panggilan sebelumnya sudah selesai. Jika ada banyak pending trades (misalnya saat burst trading), `pollPendingTrades` bisa berjalan paralel:

- Cycle 1 memulai, sedang polling trade #42 (status pending)
- Cycle 2 dimulai, juga polling trade #42
- Kedua cycle membaca status yang sama dan keduanya memanggil `updateStrategyStatsAtomic` → **strategy stats dihitung dua kali** (double count total_bought, avg_buy_price salah)

#### Diff Fix yang Direkomendasikan
```diff
+let _pollRunning = false;

 export async function pollPendingTrades() {
+  if (_pollRunning) return;
+  _pollRunning = true;
   try {
     // ... existing logic
   } catch (err) {
     // ... existing error handling
+  } finally {
+    _pollRunning = false;
   }
 }
```

---

### LIGHTER-BOT-010
**Severity:** MEDIUM  
**Kategori:** AutoRerange — Stop→Start Tidak Atomic, Window WS Gap  
**File:** `artifacts/api-server/src/lib/autoRerange.ts`  
**Baris:** 246–248  

#### Kode Bermasalah
```typescript
// handleApprove() baris 246-248:
await stopBotFn(strategyId);   // unregisterPriceCallback → mungkin close WS
await startBotFn(strategyId);  // registerPriceCallback → reconnect WS

// Juga di handleReject dan handleConfirmationTimeout:
await stopBotFn(strategyId);   // bot berhenti tapi tidak di-restart
```

#### Dampak Nyata
1. **Saat Approve**: Ada jeda antara `stopBotFn` selesai dan `startBotFn` menyelesaikan registrasi WS. Jika ada tick harga di celah ini, price callback tidak terpanggil (tidak ada handler terdaftar). Ini minor karena `startBotFn` memerlukan <500ms.

2. **Lebih serius — saat startBotFn**: `startBot` membuat timer baru DAN `setTimeout(() => runStrategyOnce, 2000)`. Karena `stopBot` sudah dihitung sebelumnya, ada kemungkinan stale DB state race jika `stopBot` belum selesai menulis `isRunning: false` ke DB saat `startBot` membaca dan menulis `isRunning: true`. Jika DB write reorder terjadi, DB bisa menunjukkan `isRunning: false` padahal bot sudah jalan lagi.

3. **Saat Reject/Timeout**: `stopBotFn` dipanggil di dalam handler Telegram callback. Jika Telegram callback timeout terjadi bersamaan dengan user menekan button, `handleReject` bisa dipanggil dua kali (Telegram retry). `pendingConfirmations.delete(token)` di awal `handleReject` mencegah ini, tapi `stopBotFn` sudah dipanggil sekali.

#### Diff Fix yang Direkomendasikan
Tambah `await new Promise(r => setTimeout(r, 100))` antara stop dan start sebagai buffer minimal, dan verifikasi DB state setelah stop sebelum start:

```diff
 await stopBotFn(strategyId);
+// Beri waktu DB write selesai sebelum startBot membaca state
+await new Promise(r => setTimeout(r, 200));
 await startBotFn(strategyId);
```
> Fix yang lebih robust: `startBot` sudah mengoverride `isRunning` di DB, jadi urutan race seharusnya aman. Tapi buffer 200ms mengurangi risiko write reorder di PostgreSQL di bawah beban tinggi.

---

### LIGHTER-BOT-011
**Severity:** LOW  
**Kategori:** State Management — generateToken() Entropy Lemah  
**File:** `artifacts/api-server/src/lib/autoRerange.ts`  
**Baris:** 98–100  

#### Kode Bermasalah
```typescript
function generateToken(): string {
  return Math.random().toString(36).substring(2, 10);
}
```

#### Dampak Nyata
`Math.random()` menghasilkan ~52 bit entropy, tapi `substring(2, 10)` hanya mengambil 8 karakter base-36 ≈ ~41 bit. Token ini digunakan sebagai callback data Telegram (`ar_approve_{strategyId}_{token}`). Callback data terkirim ke server Telegram yang bisa dilog.

Jika seseorang mengetahui `strategyId` dan bisa meng-enumerate token (41 bit = ~2 triliun kemungkinan — tidak feasible brute force), risiko rendah. Namun `Math.random()` tidak cryptographically secure dan bisa diprediksi dalam kondisi tertentu.

#### Diff Fix yang Direkomendasikan
```diff
+import { randomBytes } from "crypto";

 function generateToken(): string {
-  return Math.random().toString(36).substring(2, 10);
+  return randomBytes(8).toString("hex"); // 64 bit entropy, cryptographically secure
 }
```

---

### LIGHTER-BOT-012
**Severity:** LOW  
**Kategori:** State Management — cleanupOldLogs Membuang Hasil DB  
**File:** `artifacts/api-server/src/lib/botEngine.ts`  
**Baris:** 1155–1162  

#### Kode Bermasalah
```typescript
export async function cleanupOldLogs() {
  try {
    const cutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await db.delete(botLogsTable).where(lt(botLogsTable.createdAt, cutoff));
    logger.info({ cutoff }, "Old bot logs cleaned up");
    // ^ result dideklarasikan tapi tidak digunakan di logger
  } catch (err) {
    logger.error({ err }, "Failed to cleanup old logs");
  }
}
```

#### Dampak Nyata
`result` berisi jumlah baris yang dihapus (Drizzle mengembalikan `{ rowCount: number }`). Log tidak mencatat berapa baris terhapus, sehingga operator tidak bisa memantau pertumbuhan log atau mengkonfirmasi cleanup berjalan.

#### Diff Fix yang Direkomendasikan
```diff
-    logger.info({ cutoff }, "Old bot logs cleaned up");
+    logger.info({ cutoff, deleted: (result as any).rowCount ?? "unknown" }, "Old bot logs cleaned up");
```

---

### LIGHTER-BOT-013
**Severity:** COSMETIC  
**Kategori:** Routes — Response Message Salah untuk Bot Sudah Berjalan  
**File:** `artifacts/api-server/src/routes/bot.ts`  
**Baris:** 18–39  

#### Kode Bermasalah
```typescript
router.post("/start/:strategyId", async (req: AuthRequest, res) => {
  const success = await startBot(strategyId);
  // startBot() mengembalikan true BAIK untuk start baru MAUPUN sudah running
  res.json({
    strategyId,
    isRunning: true,
    message: "Bot started successfully",  // <-- pesan sama meski bot sudah running
    nextRunAt: nextRunAt?.toISOString() ?? null,
  });
```

#### Dampak Nyata
Jika user atau frontend memanggil `/bot/start/123` pada bot yang sudah berjalan, response `"Bot started successfully"` bisa membingungkan (terkesan bot baru di-start padahal sudah running). Tidak ada data loss, hanya misleading UI.

#### Diff Fix yang Direkomendasikan
```diff
+const alreadyRunning = isRunning(strategyId);
 const success = await startBot(strategyId);
 res.json({
   strategyId,
   isRunning: true,
-  message: "Bot started successfully",
+  message: alreadyRunning ? "Bot already running" : "Bot started successfully",
   nextRunAt: nextRunAt?.toISOString() ?? null,
 });
```

---

### LIGHTER-BOT-014
**Severity:** COSMETIC  
**Kategori:** WebSocket — Keepalive Subscribe ke Channel "height" Bukan Ping  
**File:** `artifacts/api-server/src/lib/lighterWs.ts`  
**Baris:** 49–57  

#### Kode Bermasalah
```typescript
function startKeepalive(): void {
  keepaliveTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      sendJson({ type: "subscribe", channel: "height" });
    }
  }, 25_000);
}
```

#### Dampak Nyata
Keepalive menggunakan `type: "subscribe", channel: "height"` setiap 25 detik. Ini akan membuat server merespons dengan height updates setiap 25 detik — yang kemudian diignore oleh message handler karena `msg.type !== "update/ticker"`. Ini adalah side effect yang tidak berbahaya tapi menghasilkan traffic tidak perlu.

Perlu diverifikasi apakah Lighter WS mendukung `type: "ping"` atau mekanisme keepalive yang tepat sesuai dokumentasi. Jika ada, gunakan itu. Jika tidak, subscribe ke channel dummy seperti ini acceptable.

#### Diff Fix yang Direkomendasikan
Verifikasi dari `referensi/lighter-docs/reference/websocket.md`. Jika ada ping/pong:
```diff
-sendJson({ type: "subscribe", channel: "height" });
+sendJson({ type: "ping" });  // atau sesuai dokumentasi WS Lighter
```

---

## Prioritas Perbaikan

| Prioritas | ID | Alasan |
|---|---|---|
| 1 | LIGHTER-BOT-001 | Race condition bisa kirim order duplikat → kerugian finansial |
| 2 | LIGHTER-BOT-002 | WS parsing bug bisa membuat seluruh grid engine tidak responsif |
| 3 | LIGHTER-BOT-006 | Grid state hilang saat restart → order salah level |
| 4 | LIGHTER-BOT-004 | maxOrders tidak dipatuhi → overtrading |
| 5 | LIGHTER-BOT-005 | DCA interval tidak adaptif → user experience buruk |
| 6 | LIGHTER-BOT-003 | SL/TP falsy check → SL bisa tidak trigger |
| 7 | LIGHTER-BOT-007 | Batch orders satu harga → grid limit tidak efektif |
| 8 | LIGHTER-BOT-009 | Poll overlap → stats dihitung dua kali |
| 9 | LIGHTER-BOT-008 | Retry non-retryable errors → latency tinggi saat gagal |
| 10 | LIGHTER-BOT-010 | Stop→start gap → minor WS disconnect |
| 11-14 | LOW/COSMETIC | Minor, bisa dijadwalkan kapan saja |

---

## Catatan: Tidak Ada Inkonsistensi dengan Extended/Ethereal Engine

Berdasarkan review file, tidak ada referensi ke "Extended Engine" atau "Ethereal Engine" dalam codebase ini. `botEngine.ts` adalah satu-satunya engine. Kemungkinan terminologi ini merujuk pada rencana/engine lain yang belum diimplementasi, atau sudah dihapus. Tidak ada inkonsistensi yang bisa dinilai.

---

## Langkah Selanjutnya

1. Review dan setujui temuan ini
2. Konfirmasi LIGHTER-BOT-002 dengan membaca `referensi/lighter-docs/reference/websocket.md` (format channel response)
3. Berikan persetujuan untuk mulai perbaikan, urutkan sesuai prioritas atau sekaligus
4. Setelah fix, perlu migration DB untuk LIGHTER-BOT-006 (`grid_last_level` column)

**Tidak ada perubahan kode yang dilakukan dalam dokumen ini. Semua fix di atas hanyalah rekomendasi.**
