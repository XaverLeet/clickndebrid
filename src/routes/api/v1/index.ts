import { Router } from "express";
import packagesRouter from "./packages";

const router = Router();

// Mount package routes
router.use("/packages", packagesRouter);

export default router;
