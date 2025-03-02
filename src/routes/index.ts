import { Router } from "express";
import rootRouter from "./root";
import flashRouter from "./flash";
import apiRouter from "./api";
import adminRouter from "./admin";

const router = Router();

// Mount route modules
router.use("/", rootRouter);
router.use("/flash", flashRouter);
router.use("/api", apiRouter);
router.use("/admin", adminRouter);

export default router;
