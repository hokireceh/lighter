import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
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
    // Find user by active status and expiry — we will verify password manually
    // to support both hashed (new) and unhashed (legacy) comparisons.
    const users = await db.query.usersTable.findMany({
      where: and(
        eq(usersTable.isActive, true),
        gt(usersTable.expiresAt, new Date())
      ),
    });

    let matchedUser: typeof users[number] | null = null;

    for (const user of users) {
      if (user.passwordHash) {
        // Modern: bcrypt comparison
        const match = await bcrypt.compare(password, user.passwordHash);
        if (match) { matchedUser = user; break; }
      } else {
        // Legacy: plain text comparison (transparent migration)
        if (user.password === password) {
          matchedUser = user;
          // Upgrade: hash and store for next time
          const hash = await bcrypt.hash(password, 12);
          db.update(usersTable)
            .set({ passwordHash: hash, updatedAt: new Date() })
            .where(eq(usersTable.id, user.id))
            .catch(() => {});
          break;
        }
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: "Password tidak valid atau langganan sudah habis" });
    }

    req.userId = matchedUser.id;
    req.userTelegramId = matchedUser.telegramId;
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
