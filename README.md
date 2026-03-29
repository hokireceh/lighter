# LighterBot

Trading bot otomatis untuk exchange [Lighter.xyz](https://lighter.xyz) dengan dashboard web dan notifikasi Telegram.

---

## Fitur

- Grid Bot & DCA Bot
- Dashboard web (React)
- Notifikasi Telegram
- Pembayaran via Saweria (QR code)
- Paper trading (tanpa private key)

---

## Environment Variables

| Key | Keterangan |
|-----|-----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Port API server |
| `NODE_ENV` | `development` / `production` |
| `ADMIN_PASSWORD` | Password login dashboard |
| `BOT_TOKEN` | Token bot Telegram dari @BotFather |
| `ADMIN_CHAT_ID` | Chat ID Telegram admin (dari @userinfobot) |
| `SAWERIA_USERNAME` | Username Saweria |
| `SAWERIA_USER_ID` | User ID Saweria (dari DevTools → request `/streams/me`) |

---

## Setup Grid Bot

### 1. Isi Kredensial Lighter

Sebelum bisa trading live, buka **Settings** di dashboard dan isi:

| Field | Keterangan |
|-------|-----------|
| **Private Key** | Private key API kamu (bukan private key wallet L1!) — didapat saat membuat API key di platform Lighter |
| **Account Index** | Indeks akun Lighter kamu — bisa dicek via Settings di [app.lighter.xyz](https://app.lighter.xyz) atau query API dengan L1 address |
| **API Key Index** | Indeks API key yang kamu buat — terlihat di halaman [app.lighter.xyz/apikeys](https://app.lighter.xyz/apikeys). Gunakan index yang kamu buat sendiri (bukan yang sudah ada sebelumnya) |

> **Cara mendapatkan API Key:** Buka [app.lighter.xyz](https://app.lighter.xyz) → Settings → API Keys → Create New Key. Catat index dan private key yang diberikan.
>
> Tanpa ini, bot berjalan dalam mode **Paper Trading** (simulasi, tidak ada order nyata).

### 2. Buat Strategi Grid Bot

1. Buka halaman **Strategies** → klik **New Strategy**
2. Pilih tab **Grid Bot**
3. Isi parameter:

| Parameter | Keterangan | Contoh |
|-----------|-----------|--------|
| **Name** | Nama unik bot ini | `ETH Grid 1` |
| **Market** | Pasangan trading | `ETH/USDC` |
| **Lower Price** | Batas bawah range harga | `1800` |
| **Upper Price** | Batas atas range harga | `2200` |
| **Grid Levels** | Jumlah level grid (2–100) | `10` |
| **Amount per Grid** | Modal USDC per level | `10` |
| **Mode** | `neutral` / `long` / `short` | `neutral` |

4. Klik **Create Bot** → lalu tekan **Start**

### Cara Kerja Grid Bot

- Bot berjalan setiap **60 detik**
- Range harga dibagi rata sesuai jumlah grid level
- Setiap level = satu posisi buy/sell
- Jika harga keluar dari range → bot monitor sampai harga kembali

### Tips Setting

- **Range sempit + level banyak** = grid rapat, cocok untuk market sideways
- **Range lebar + level sedikit** = grid jarang, cocok untuk market trending
- Pastikan modal cukup: `Grid Levels × Amount per Grid` = total modal yang dibutuhkan
- Mode `neutral` paling aman untuk pemula

---

## Deploy di Replit

### Environment

- Frontend: port **5000** (webview)
- Backend API: port **4001** (internal)
- Frontend proxy `/api` → `http://localhost:4001`

### Secrets yang harus diset di Replit

Masuk ke **Secrets** di sidebar Replit, tambahkan semua key dari tabel Environment Variables di atas. `DATABASE_URL` otomatis tersedia dari Replit PostgreSQL.

### Workflow

| Workflow | Command | Port |
|----------|---------|------|
| `Start application` | `PORT=4001 node artifacts/api-server/dist/index.mjs & PORT=5000 pnpm --filter @workspace/lighter-bot run dev` | 5000 + 4001 |

### Update setelah perubahan kode

```bash
# Di Replit Shell
pnpm install
pnpm --filter @workspace/db run push        # jika ada perubahan schema
pnpm --filter @workspace/api-server build   # rebuild API setelah perubahan
```

Lalu restart workflow `Start application`.

---

## Deploy di Home Server (aaPanel)

**Setup:** aaPanel + Apache | **Domain:** pay.bukitcuan.fun
**Lokasi project:** `/www/wwwroot/lighter`

### Prasyarat

```bash
node -v        # minimal v20
npm install -g pnpm pm2
```

### Langkah 1 — Database PostgreSQL

aaPanel → **Database → PostgreSQL → Add Database**:

| Field | Nilai |
|-------|-------|
| DB Name | `lighter` |
| Username | `lighter` |
| Password | *(buat password kuat)* |

### Langkah 2 — File .env

```bash
nano /www/wwwroot/lighter/.env
```

```env
DATABASE_URL=postgresql://lighter:PASSWORD@localhost:5432/lighter
PORT=4001
NODE_ENV=production
ADMIN_PASSWORD=password_kuat
BOT_TOKEN=123456789:AAxxxxxxxx
ADMIN_CHAT_ID=123456789
SAWERIA_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SAWERIA_USERNAME=username_saweria
```

### Langkah 3 — Install & Setup DB

```bash
cd /www/wwwroot/lighter
pnpm install
export $(grep -v '^#' .env | xargs)
pnpm --filter @workspace/db run push
```

### Langkah 4 — Build

```bash
pnpm run build
```

### Langkah 5 — Jalankan dengan PM2

Buat file `ecosystem.config.cjs` di root project:

```javascript
// /www/wwwroot/lighter/ecosystem.config.cjs
require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
  apps: [{
    name: "lighterbot-api",
    script: "artifacts/api-server/dist/index.mjs",
    cwd: "/www/wwwroot/lighter",
    env: {
      PORT: 4001,
      NODE_ENV: "production",
      DATABASE_URL: process.env.DATABASE_URL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      BOT_TOKEN: process.env.BOT_TOKEN,
      ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID,
      SAWERIA_USERNAME: process.env.SAWERIA_USERNAME,
      SAWERIA_USER_ID: process.env.SAWERIA_USER_ID,
    }
  }]
};
```

```bash
cd /www/wwwroot/lighter
npm install -g dotenv  # untuk ecosystem.config.cjs
pm2 start ecosystem.config.cjs
pm2 startup && pm2 save
```

> **Penting:** Gunakan ecosystem.config.cjs (bukan langsung `pm2 start`), karena env vars dari `.env` tidak akan tersedia setelah PM2 restart tanpa ini.

### Langkah 6 — Konfigurasi Apache

Cari bagian `<Directory ...> yang ada AllowOverride All` -nya, tambahkan 4 baris ini di dalam block tersebut:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api
RewriteRule ^ /index.html [L]
```

```bash
/etc/init.d/httpd restart
```

### Langkah 7 — SSL

aaPanel → **Website → pay.bukitcuan.fun → SSL → Let's Encrypt → Apply**

### Update Aplikasi

```bash
cd /www/wwwroot/lighter
git pull
pnpm install
pnpm run build
pm2 restart ecosystem.config.cjs
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| API tidak merespons | `pm2 logs lighterbot-api --lines 50` |
| Database error | `psql $DATABASE_URL -c "SELECT 1"` |
| Frontend blank/404 | Cek `ls artifacts/lighter-bot/dist/` — pastikan sudah build |
| Port sudah dipakai | `ss -tlnp \| grep 4001` — ganti port di .env dan Apache config |
| Bot tidak mulai | Cek kredensial Lighter di Settings dashboard |

---

## Keamanan

- Port PostgreSQL (5432) **jangan dibuka ke internet**
- Aktifkan Firewall — hanya buka port 80, 443, 22
- Gunakan password kuat untuk `ADMIN_PASSWORD` dan database
- Jangan commit file `.env` ke Git

---

## Perintah PM2

```bash
pm2 status                         # lihat semua process
pm2 logs lighterbot-api            # log realtime
pm2 restart lighterbot-api         # restart
pm2 monit                          # monitor CPU/RAM
```
