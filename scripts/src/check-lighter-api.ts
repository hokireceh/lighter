/**
 * check-lighter-api.ts
 *
 * Verifikasi endpoint Lighter API yang dipakai di kode sudah sesuai
 * dengan dokumentasi resmi. Jalankan kapan saja ada update docs atau
 * saat curiga ada bug endpoint.
 *
 * Run: pnpm --filter @workspace/scripts run check-lighter-api
 *
 * Docs resmi: https://apidocs.lighter.xyz/reference/
 */

const BASE = "https://mainnet.zklighter.elliot.ai";

// ─── REFERENSI LENGKAP: semua endpoint dari dokumentasi resmi ────────────────
// Sumber: https://apidocs.lighter.xyz/reference/
const DOCUMENTED_ENDPOINTS = {
  // System
  systemConfig:        { method: "GET",  path: "/api/v1/systemConfig" },
  status:              { method: "GET",  path: "/api/v1/status" },

  // Order Book (Market Data)
  orderBookDetails:    { method: "GET",  path: "/api/v1/orderBookDetails" },   // list semua market + stats
  orderBooks:          { method: "GET",  path: "/api/v1/orderBooks" },          // list ringkas order book
  orderBookOrders:     { method: "GET",  path: "/api/v1/orderBookOrders" },     // bids & asks (L2 depth)
  recentTrades:        { method: "GET",  path: "/api/v1/recentTrades" },        // recent trades per market
  trades:              { method: "GET",  path: "/api/v1/trades" },              // trade history (filter-able)
  candles:             { method: "GET",  path: "/api/v1/candles" },             // OHLCV candles
  exchangeStats:       { method: "GET",  path: "/api/v1/exchangeStats" },
  exchangeMetrics:     { method: "GET",  path: "/api/v1/exchangeMetrics" },
  executeStats:        { method: "GET",  path: "/api/v1/executeStats" },
  fundings:            { method: "GET",  path: "/api/v1/fundings" },
  fundingRates:        { method: "GET",  path: "/api/v1/fundingRates" },
  assetDetails:        { method: "GET",  path: "/api/v1/assetDetails" },
  publicPoolsMetadata: { method: "GET",  path: "/api/v1/publicPoolsMetadata" },
  announcement:        { method: "GET",  path: "/api/v1/announcement" },
  tokenList:           { method: "GET",  path: "/api/v1/tokenList" },

  // Account
  account:             { method: "GET",  path: "/api/v1/account" },             // by=index | l1_address
  accountsByL1Address: { method: "GET",  path: "/api/v1/accountsByL1Address" }, // semua akun dari 1 L1
  accountLimits:       { method: "GET",  path: "/api/v1/accountLimits" },
  accountMetadata:     { method: "GET",  path: "/api/v1/accountMetadata" },
  accountActiveOrders: { method: "GET",  path: "/api/v1/accountActiveOrders" },
  accountInactiveOrders:{ method: "GET", path: "/api/v1/accountInactiveOrders" },
  pnl:                 { method: "GET",  path: "/api/v1/pnl" },
  l1Metadata:          { method: "GET",  path: "/api/v1/l1Metadata" },
  liquidations:        { method: "GET",  path: "/api/v1/liquidations" },
  positionFunding:     { method: "GET",  path: "/api/v1/positionFunding" },
  changeAccountTier:   { method: "POST", path: "/api/v1/changeAccountTier" },

  // Transactions
  sendTx:              { method: "POST", path: "/api/v1/sendTx" },              // kirim 1 tx
  sendTxBatch:         { method: "POST", path: "/api/v1/sendTxBatch" },         // kirim banyak tx sekaligus
  tx:                  { method: "GET",  path: "/api/v1/tx" },                  // by=hash | sequence_index
  txFromL1TxHash:      { method: "GET",  path: "/api/v1/txFromL1TxHash" },
  nextNonce:           { method: "GET",  path: "/api/v1/nextNonce" },           // wajib sebelum sign order
  export:              { method: "GET",  path: "/api/v1/export" },

  // History
  depositHistory:      { method: "GET",  path: "/api/v1/deposit/history" },
  depositLatest:       { method: "GET",  path: "/api/v1/deposit/latest" },
  depositNetworks:     { method: "GET",  path: "/api/v1/deposit/networks" },
  transferHistory:     { method: "GET",  path: "/api/v1/transfer/history" },
  withdrawHistory:     { method: "GET",  path: "/api/v1/withdraw/history" },
  withdrawalDelay:     { method: "GET",  path: "/api/v1/withdrawalDelay" },
  transferFeeInfo:     { method: "GET",  path: "/api/v1/transferFeeInfo" },

  // API Keys & Auth
  apiKeys:             { method: "GET",  path: "/api/v1/apiKeys" },
  tokensCreate:        { method: "POST", path: "/api/v1/tokens/create" },
  tokensRevoke:        { method: "POST", path: "/api/v1/tokens/revoke" },
  tokens:              { method: "GET",  path: "/api/v1/tokens" },

  // Fast Withdraw / Bridge
  fastWithdraw:        { method: "POST", path: "/api/v1/fastWithdraw" },
  fastWithdrawInfo:    { method: "GET",  path: "/api/v1/fastWithdraw/info" },
  fastBridgeInfo:      { method: "GET",  path: "/api/v1/fastBridge/info" },

  // Referral
  userReferrals:       { method: "GET",  path: "/api/v1/userReferrals" },
  referralCreate:      { method: "POST", path: "/api/v1/referral/create" },
  referralGet:         { method: "GET",  path: "/api/v1/referral/get" },
  referralUpdate:      { method: "POST", path: "/api/v1/referral/update" },
  referralUse:         { method: "POST", path: "/api/v1/referral/use" },
  referralKickbackUpdate: { method: "POST", path: "/api/v1/referral/kickbackUpdate" },

  // Leases
  leaseOptions:        { method: "GET",  path: "/api/v1/leaseOptions" },
  leases:              { method: "GET",  path: "/api/v1/leases" },
  litLease:            { method: "POST", path: "/api/v1/litLease" },

  // Notifications
  notificationAck:     { method: "POST", path: "/api/v1/notificationAck" },

  // Intent Address
  createIntentAddress: { method: "POST", path: "/api/v1/createIntentAddress" },
} as const;

// ─── ENDPOINT YANG DIPAKAI DI KODE INI ──────────────────────────────────────
// Setiap kali nambah/ubah endpoint di lighterApi.ts, update sini juga.
const USED_IN_CODE: Record<string, { method: string; path: string; params?: string }> = {
  getOrderBooks:      { method: "GET", path: "/api/v1/orderBookDetails",  params: "filter=all (opsional)" },
  getCandles:         { method: "GET", path: "/api/v1/candles",           params: "market_id, resolution (enum), start_timestamp, end_timestamp, count_back" },
  getOrderBookDepth:  { method: "GET", path: "/api/v1/orderBookOrders",  params: "market_id, limit (1-250)" },
  getAccountByIndex:  { method: "GET", path: "/api/v1/account",          params: "by=index, value={accountIndex}" },
  getAccountByL1:     { method: "GET", path: "/api/v1/account",          params: "by=l1_address, value={address}" },
  getNextNonce:       { method: "GET", path: "/api/v1/nextNonce",         params: "account_index, api_key_index" },
  sendTx:             { method: "POST",path: "/api/v1/sendTx",            params: "tx_type, tx_info, price_protection (form-urlencoded)" },
  sendTxBatch:        { method: "POST",path: "/api/v1/sendTxBatch",       params: "tx_types, tx_infos (form-urlencoded)" },
  getTx:              { method: "GET", path: "/api/v1/tx",                params: "by=hash|sequence_index, value" },
  getTxFromL1TxHash:  { method: "GET", path: "/api/v1/txFromL1TxHash",   params: "hash" },
  getDepositHistory:  { method: "GET", path: "/api/v1/deposit/history",  params: "account_index, l1_address, authorization, cursor?, filter?" },
  getTransferHistory: { method: "GET", path: "/api/v1/transfer/history", params: "account_index, authorization?, cursor?, type[]?" },
  getWithdrawHistory: { method: "GET", path: "/api/v1/withdraw/history", params: "account_index, authorization, cursor?, filter?" },
};

// ─── CATATAN PENTING PARAMETER ───────────────────────────────────────────────
const NOTES = `
CATATAN PENTING (baca sebelum debug):

1. candles — resolution harus pakai ENUM STRING: 1m | 5m | 15m | 30m | 1h | 4h | 12h | 1d | 1w
   - BUKAN angka seperti "60" atau "240"!
   - Timestamps: start_timestamp & end_timestamp dalam MILIDETIK (bukan detik)
   - count_back WAJIB dikirim (required)

2. orderBookOrders — response-nya NESTED:
   - response.order_book.bids  ← bukan response.bids
   - response.order_book.asks  ← bukan response.asks
   - Param: limit (bukan depth), range 1-250

3. account — satu endpoint, dua mode:
   - by=index  → cari by account index
   - by=l1_address → cari by wallet address

4. sendTx / sendTxBatch — Content-Type: application/x-www-form-urlencoded
   - BUKAN JSON body!

5. nextNonce — selalu panggil ini SEBELUM sign order, tiap kali order baru

6. Semua GET endpoint: wajib header "accept: application/json"
`;

// ─── VALIDASI: cek endpoint di kode ada di docs ───────────────────────────────
function validateEndpoints() {
  const docPaths = new Set<string>(Object.values(DOCUMENTED_ENDPOINTS).map(e => e.path));

  console.log("=".repeat(60));
  console.log("  LIGHTER API ENDPOINT CHECKER");
  console.log("=".repeat(60));

  let allOk = true;
  for (const [fnName, endpoint] of Object.entries(USED_IN_CODE)) {
    const inDocs = docPaths.has(endpoint.path);
    const status = inDocs ? "✅" : "❌ TIDAK ADA DI DOCS!";
    console.log(`\n${status} ${fnName}()`);
    console.log(`   ${endpoint.method} ${endpoint.path}`);
    if (endpoint.params) console.log(`   Params: ${endpoint.params}`);
    if (!inDocs) allOk = false;
  }

  console.log("\n" + "=".repeat(60));
  if (allOk) {
    console.log("✅ Semua endpoint sudah sesuai dengan dokumentasi resmi.");
  } else {
    console.log("❌ Ada endpoint yang tidak sesuai docs — cek ulang lighterApi.ts!");
  }
  console.log("=".repeat(60));
  console.log(NOTES);
}

// ─── PING: tes koneksi ke beberapa endpoint kritis ────────────────────────────
async function pingEndpoints() {
  const QUICK_PINGS = [
    { name: "orderBookDetails", url: `${BASE}/api/v1/orderBookDetails?filter=perp` },
    { name: "status",           url: `${BASE}/api/v1/status` },
    { name: "recentTrades",     url: `${BASE}/api/v1/recentTrades?market_id=1&limit=1` },
    { name: "candles",          url: `${BASE}/api/v1/candles?market_id=1&resolution=1h&start_timestamp=${Date.now() - 3600000}&end_timestamp=${Date.now()}&count_back=5` },
    { name: "orderBookOrders",  url: `${BASE}/api/v1/orderBookOrders?market_id=1&limit=5` },
    { name: "nextNonce",        url: `${BASE}/api/v1/nextNonce?account_index=1&api_key_index=0` },
  ];

  console.log("\n" + "=".repeat(60));
  console.log("  LIVE PING TEST (mainnet)");
  console.log("=".repeat(60));

  for (const ping of QUICK_PINGS) {
    try {
      const res = await fetch(ping.url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) });
      const text = await res.text();
      let preview = text.slice(0, 80).replace(/\n/g, " ");
      if (text.length > 80) preview += "...";
      const statusIcon = res.ok ? "✅" : "⚠️ ";
      console.log(`\n${statusIcon} [${res.status}] ${ping.name}`);
      console.log(`   ${ping.url.replace(BASE, "")}`);
      console.log(`   Response: ${preview}`);
    } catch (err: any) {
      console.log(`\n❌ [ERROR] ${ping.name}`);
      console.log(`   ${err.message}`);
    }
  }
  console.log("\n" + "=".repeat(60));
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  const args = process.argv.slice(2);
  const doPing = args.includes("--ping");

  validateEndpoints();
  if (doPing) {
    await pingEndpoints();
  } else {
    console.log('\n💡 Tip: tambah flag --ping untuk tes koneksi live ke mainnet');
    console.log('   pnpm --filter @workspace/scripts run check-lighter-api -- --ping\n');
  }
})();
