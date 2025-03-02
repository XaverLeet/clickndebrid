import { Router } from "express";
import rootRouter from "./root.js";
import flashRouter from "./flash.js";
import apiRouter from "./api/index.js";
import adminRouter from "./admin.js";

const router = Router();

// Mount route modules
router.use("/", rootRouter);
router.use("/flash", flashRouter);
router.use("/api", apiRouter);
router.use("/admin", adminRouter);

export default router;
