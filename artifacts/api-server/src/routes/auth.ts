import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

const router = Router();

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const password = authHeader.slice(7).trim();

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && password === adminPassword) {
    return res.json({
      id: 0,
      telegramId: "admin",
      telegramName: "Admin",
      telegramUsername: "admin",
      plan: "lifetime",
      expiresAt: null,
      isAdmin: true,
    });
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

    res.json({
      id: user.id,
      telegramId: user.telegramId,
      telegramName: user.telegramName,
      telegramUsername: user.telegramUsername,
      plan: user.plan,
      expiresAt: user.expiresAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Auth error" });
  }
});

export default router;
