import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";
import apiRouter from "./index.js";
// Import is used in the mock
import "./v1/index.js";

// Mock dependencies
jest.mock("./v1/index.js", () => {
  const mockRouter = express.Router();
  mockRouter.get("/test", (req, res) => {
    res.json({ message: "v1 test endpoint" });
  });
  return mockRouter;
});

describe("API Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    // Setup Express app with the API router
    app = express();
    app.use(express.json());
    app.use("/api", apiRouter);
  });

  it("should route to v1 endpoints correctly", async () => {
    const response = await request(app).get("/api/v1/test");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "v1 test endpoint" });
  });
});
