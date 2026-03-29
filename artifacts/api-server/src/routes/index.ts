import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marketRouter from "./market";
import configRouter from "./config";
import botRouter from "./bot";
import tradesRouter from "./trades";
import historyRouter from "./history";
import adminRouter from "./admin";
import authRouter from "./auth";
import aiRouter from "./ai";
import { adminMiddleware } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/market", marketRouter);
router.use("/config", configRouter);
router.use("/bot", botRouter);
router.use("/trades", tradesRouter);
router.use("/history", historyRouter);
router.use("/ai", aiRouter);
router.use("/admin", adminMiddleware as any, adminRouter);

export default router;
