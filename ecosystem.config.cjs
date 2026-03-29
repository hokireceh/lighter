require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
  apps: [{
    name: "lighterbot-api",
    script: "artifacts/api-server/dist/index.mjs",
    cwd: "/www/wwwroot/lighter",
    interpreter: "node",
    interpreter_args: "--enable-source-maps",
    env: {
      PORT: 4001,
      NODE_ENV: "production",
      DATABASE_URL: process.env.DATABASE_URL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      BOT_TOKEN: process.env.BOT_TOKEN,
      ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID,
      SAWERIA_USERNAME: process.env.SAWERIA_USERNAME,
      SAWERIA_USER_ID: process.env.SAWERIA_USER_ID,
      HTTPS_PROXY: process.env.HTTPS_PROXY || "",
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "",
      GROQ_API_KEY: process.env.GROQ_API_KEY || "",
      GROQ_API_KEY_2: process.env.GROQ_API_KEY_2 || "",
      GROQ_API_KEY_3: process.env.GROQ_API_KEY_3 || "",
      GROQ_API_KEY_4: process.env.GROQ_API_KEY_4 || "",
      GROQ_API_KEY_5: process.env.GROQ_API_KEY_5 || "",
    }
  }]
};
