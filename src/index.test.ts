import request from "supertest";
import express from "express";
import { getTourData } from "./api";
import cors from "cors";

describe("GET /tour", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(cors());
    app.get("/tour", async (req, res) => {
      try {
        const data = await getTourData();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch tour data" });
      }
    });
  });

  it("should return 200 and JSON", async () => {
    const res = await request(app).get("/tour");
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/json/);
  });
});
