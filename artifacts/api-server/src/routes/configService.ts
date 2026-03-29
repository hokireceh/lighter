import { db } from "@workspace/db";
import { botConfigTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "../lib/encrypt";

const CONFIG_KEYS = {
  ACCOUNT_INDEX: "account_index",
  API_KEY_INDEX: "api_key_index",
  PRIVATE_KEY: "private_key",
  NETWORK: "network",
  L1_ADDRESS: "l1_address",
  NOTIFY_ON_BUY: "notify_on_buy",
  NOTIFY_ON_SELL: "notify_on_sell",
  NOTIFY_ON_ERROR: "notify_on_error",
  NOTIFY_ON_START: "notify_on_start",
  NOTIFY_ON_STOP: "notify_on_stop",
  NOTIFY_BOT_TOKEN: "notify_bot_token",
  NOTIFY_CHAT_ID: "notify_chat_id",
};

const ENCRYPTED_KEYS = new Set([CONFIG_KEYS.PRIVATE_KEY, CONFIG_KEYS.NOTIFY_BOT_TOKEN]);

async function getConfigValue(userId: number, key: string): Promise<string | null> {
  const row = await db.query.botConfigTable.findFirst({
    where: and(eq(botConfigTable.userId, userId), eq(botConfigTable.key, key)),
  });
  if (!row?.value) return null;
  return ENCRYPTED_KEYS.has(key) ? decrypt(row.value) : row.value;
}

async function setConfigValue(userId: number, key: string, value: string) {
  const storedValue = ENCRYPTED_KEYS.has(key) ? encrypt(value) : value;
  const existing = await db.query.botConfigTable.findFirst({
    where: and(eq(botConfigTable.userId, userId), eq(botConfigTable.key, key)),
  });
  if (existing) {
    await db.update(botConfigTable)
      .set({ value: storedValue, updatedAt: new Date() })
      .where(and(eq(botConfigTable.userId, userId), eq(botConfigTable.key, key)));
  } else {
    await db.insert(botConfigTable).values({ userId, key, value: storedValue });
  }
}

async function deleteConfigValue(userId: number, key: string) {
  await db.delete(botConfigTable).where(
    and(eq(botConfigTable.userId, userId), eq(botConfigTable.key, key))
  );
}

export async function getBotConfig(userId: number) {
  const [accountIndex, apiKeyIndex, privateKey, network, l1Address,
    notifyOnBuy, notifyOnSell, notifyOnError, notifyOnStart, notifyOnStop,
    notifyBotToken, notifyChatId] = await Promise.all([
    getConfigValue(userId, CONFIG_KEYS.ACCOUNT_INDEX),
    getConfigValue(userId, CONFIG_KEYS.API_KEY_INDEX),
    getConfigValue(userId, CONFIG_KEYS.PRIVATE_KEY),
    getConfigValue(userId, CONFIG_KEYS.NETWORK),
    getConfigValue(userId, CONFIG_KEYS.L1_ADDRESS),
    getConfigValue(userId, CONFIG_KEYS.NOTIFY_ON_BUY),
    getConfigValue(userId, CONFIG_KEYS.NOTIFY_ON_SELL),
    getConfigValue(userId, CONFIG_KEYS.NOTIFY_ON_ERROR),
    getConfigValue(userId, CONFIG_KEYS.NOTIFY_ON_START),
    getConfigValue(userId, CONFIG_KEYS.NOTIFY_ON_STOP),
    getConfigValue(userId, CONFIG_KEYS.NOTIFY_BOT_TOKEN),
    getConfigValue(userId, CONFIG_KEYS.NOTIFY_CHAT_ID),
  ]);

  return {
    accountIndex: accountIndex !== null ? parseInt(accountIndex) : null,
    apiKeyIndex: apiKeyIndex !== null ? parseInt(apiKeyIndex) : null,
    privateKey,
    network: (network ?? "mainnet") as "mainnet" | "testnet",
    l1Address,
    hasPrivateKey: !!privateKey,
    notifyOnBuy: notifyOnBuy !== null ? notifyOnBuy === "true" : true,
    notifyOnSell: notifyOnSell !== null ? notifyOnSell === "true" : true,
    notifyOnError: notifyOnError !== null ? notifyOnError === "true" : true,
    notifyOnStart: notifyOnStart !== null ? notifyOnStart === "true" : true,
    notifyOnStop: notifyOnStop !== null ? notifyOnStop === "true" : false,
    notifyBotToken,
    notifyChatId,
    hasNotifyBotToken: !!notifyBotToken,
  };
}

export async function getNotificationConfig(userId: number) {
  const config = await getBotConfig(userId);
  return {
    notifyOnBuy: config.notifyOnBuy,
    notifyOnSell: config.notifyOnSell,
    notifyOnError: config.notifyOnError,
    notifyOnStart: config.notifyOnStart,
    notifyOnStop: config.notifyOnStop,
  };
}

export async function updateBotConfig(userId: number, updates: {
  accountIndex?: number | null;
  apiKeyIndex?: number | null;
  privateKey?: string | null;
  network?: "mainnet" | "testnet";
  l1Address?: string | null;
  notifyOnBuy?: boolean | null;
  notifyOnSell?: boolean | null;
  notifyOnError?: boolean | null;
  notifyOnStart?: boolean | null;
  notifyOnStop?: boolean | null;
  notifyBotToken?: string | null;
  notifyChatId?: string | null;
}) {
  const promises: Promise<void>[] = [];

  if (updates.accountIndex !== undefined) {
    promises.push(
      updates.accountIndex !== null
        ? setConfigValue(userId, CONFIG_KEYS.ACCOUNT_INDEX, String(updates.accountIndex))
        : deleteConfigValue(userId, CONFIG_KEYS.ACCOUNT_INDEX)
    );
  }
  if (updates.apiKeyIndex !== undefined) {
    promises.push(
      updates.apiKeyIndex !== null
        ? setConfigValue(userId, CONFIG_KEYS.API_KEY_INDEX, String(updates.apiKeyIndex))
        : deleteConfigValue(userId, CONFIG_KEYS.API_KEY_INDEX)
    );
  }
  if (updates.privateKey !== undefined) {
    promises.push(
      updates.privateKey !== null
        ? setConfigValue(userId, CONFIG_KEYS.PRIVATE_KEY, updates.privateKey)
        : deleteConfigValue(userId, CONFIG_KEYS.PRIVATE_KEY)
    );
  }
  if (updates.network !== undefined) {
    promises.push(setConfigValue(userId, CONFIG_KEYS.NETWORK, updates.network));
  }
  if (updates.l1Address !== undefined) {
    promises.push(
      updates.l1Address !== null
        ? setConfigValue(userId, CONFIG_KEYS.L1_ADDRESS, updates.l1Address)
        : deleteConfigValue(userId, CONFIG_KEYS.L1_ADDRESS)
    );
  }
  if (updates.notifyOnBuy !== undefined && updates.notifyOnBuy !== null) {
    promises.push(setConfigValue(userId, CONFIG_KEYS.NOTIFY_ON_BUY, String(updates.notifyOnBuy)));
  }
  if (updates.notifyOnSell !== undefined && updates.notifyOnSell !== null) {
    promises.push(setConfigValue(userId, CONFIG_KEYS.NOTIFY_ON_SELL, String(updates.notifyOnSell)));
  }
  if (updates.notifyOnError !== undefined && updates.notifyOnError !== null) {
    promises.push(setConfigValue(userId, CONFIG_KEYS.NOTIFY_ON_ERROR, String(updates.notifyOnError)));
  }
  if (updates.notifyOnStart !== undefined && updates.notifyOnStart !== null) {
    promises.push(setConfigValue(userId, CONFIG_KEYS.NOTIFY_ON_START, String(updates.notifyOnStart)));
  }
  if (updates.notifyOnStop !== undefined && updates.notifyOnStop !== null) {
    promises.push(setConfigValue(userId, CONFIG_KEYS.NOTIFY_ON_STOP, String(updates.notifyOnStop)));
  }
  if (updates.notifyBotToken !== undefined) {
    promises.push(
      updates.notifyBotToken
        ? setConfigValue(userId, CONFIG_KEYS.NOTIFY_BOT_TOKEN, updates.notifyBotToken)
        : deleteConfigValue(userId, CONFIG_KEYS.NOTIFY_BOT_TOKEN)
    );
  }
  if (updates.notifyChatId !== undefined) {
    promises.push(
      updates.notifyChatId
        ? setConfigValue(userId, CONFIG_KEYS.NOTIFY_CHAT_ID, updates.notifyChatId)
        : deleteConfigValue(userId, CONFIG_KEYS.NOTIFY_CHAT_ID)
    );
  }

  await Promise.all(promises);
  return getBotConfig(userId);
}
