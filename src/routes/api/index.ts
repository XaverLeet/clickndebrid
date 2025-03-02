import { Router } from "express";
import v1Router from "./v1";

const router = Router();

// Mount API version routers
router.use("/v1", v1Router);

export default router;
