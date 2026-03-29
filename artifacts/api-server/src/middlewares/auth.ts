import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

export interface AuthRequest extends Request {
  userId?: number;
  userTelegramId?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const password = authHeader.slice(7).trim();
  if (!password) return res.status(401).json({ error: "Unauthorized" });

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && password === adminPassword) {
    req.userId = 0;
    req.userTelegramId = "admin";
    return next();
  }

  try {
    const user = await db.query.usersTable.findFirst({
      where: and(
        eq(usersTable.password, password),
        eq(usersTable.isActive, true),
        gt(usersTable.expiresAt, new Date())
      ),
    });

    if (!user) {
      return res.status(401).json({ error: "Password tidak valid atau langganan sudah habis" });
    }

    req.userId = user.id;
    req.userTelegramId = user.telegramId;
    next();
  } catch (err) {
    return res.status(500).json({ error: "Auth error" });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return res.status(503).json({ error: "Admin not configured" });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ") || authHeader.slice(7).trim() !== adminPassword) {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}
