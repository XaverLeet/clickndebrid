import { Router, Request, Response } from "express";
import { getCacheService as _getCacheService } from "../services/cache/cacheFactory";
import { CnlData as _CnlData } from "../types";

const router = Router();

/**
 * Render admin dashboard - Package listing page
 */
router.get("/", (_req: Request, res: Response) => {
  res.render("pages/admin/packages", {
    title: "Packages - click'n'debrid Admin",
    activeMenu: "packages",
  });
});

/**
 * Render about page
 */
router.get("/about", (_req: Request, res: Response) => {
  res.render("pages/admin/about", {
    title: "About - click'n'debrid Admin",
    activeMenu: "about",
  });
});

export default router;
