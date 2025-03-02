import { Router, Request, Response } from "express";

const router = Router();

router.get("/jdcheck.js", (_req: Request, res: Response) => {
  res.type("application/javascript");
  res.send("jdownloader=true;\nvar version='42707';");
});

router.get("/", (_req: Request, res: Response) => {
  res.redirect("/admin");
});

export default router;
