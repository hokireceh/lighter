import { pgTable, text, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const strategiesTable = pgTable("strategies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  marketIndex: integer("market_index").notNull(),
  marketSymbol: text("market_symbol").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  isRunning: boolean("is_running").default(false).notNull(),
  dcaConfig: jsonb("dca_config"),
  gridConfig: jsonb("grid_config"),
  totalOrders: integer("total_orders").default(0).notNull(),
  successfulOrders: integer("successful_orders").default(0).notNull(),
  totalBought: numeric("total_bought", { precision: 20, scale: 8 }).default("0").notNull(),
  totalSold: numeric("total_sold", { precision: 20, scale: 8 }).default("0").notNull(),
  avgBuyPrice: numeric("avg_buy_price", { precision: 20, scale: 8 }).default("0").notNull(),
  avgSellPrice: numeric("avg_sell_price", { precision: 20, scale: 8 }).default("0").notNull(),
  realizedPnl: numeric("realized_pnl", { precision: 20, scale: 8 }).default("0").notNull(),
  nextRunAt: timestamp("next_run_at"),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStrategySchema = createInsertSchema(strategiesTable);
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Strategy = typeof strategiesTable.$inferSelect;
