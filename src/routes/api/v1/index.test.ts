import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";
import v1Router from "./index.js";
// Import is used in the mock
import "./packages.js";

// Mock dependencies
jest.mock("./packages.js", () => {
  const mockRouter = express.Router();
  mockRouter.get("/test", (req, res) => {
    res.json({ message: "packages test endpoint" });
  });
  return mockRouter;
});

describe("API V1 Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    // Setup Express app with the v1 router
    app = express();
    app.use(express.json());
    app.use("/api/v1", v1Router);
  });

  it("should route to packages endpoints correctly", async () => {
    const response = await request(app).get("/api/v1/packages/test");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "packages test endpoint" });
  });
});
