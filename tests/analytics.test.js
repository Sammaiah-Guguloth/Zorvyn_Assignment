import request from "supertest";
import app from "../src/app.js";
import userModel from "../src/models/user.model.js";
import recordModel from "../src/models/record.model.js";
import { ROLES, STATUS, TRANSACTION_TYPES } from "../src/utils/constants.util.js";
import { connectDB, disconnectDB, clearDB } from "./setup.js";
import { jest } from "@jest/globals";

// Set generous timeout boundary since MongoDB memory instantiations combined with 
// 3x Bcrypt standard salt round hashing natively exceeds 5000ms regularly!
jest.setTimeout(30000);

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

afterEach(async () => {
  await clearDB();
});

describe("Analytics APIs", () => {
  let adminCookie = "";
  let analystCookie = "";
  let viewerCookie = "";
  let adminId = "";

  beforeEach(async () => {
    // Seed Users
    const adminUser = await userModel.create({
      name: "Test Admin", email: "admin@test.com", password: "password123", role: ROLES.ADMIN, status: STATUS.ACTIVE,
    });
    adminId = adminUser._id.toString();

    await userModel.create({
      name: "Test Analyst", email: "analyst@test.com", password: "password123", role: ROLES.ANALYST, status: STATUS.ACTIVE,
    });

    await userModel.create({
      name: "Test Viewer", email: "viewer@test.com", password: "password123", role: ROLES.VIEWER, status: STATUS.ACTIVE,
    });

    // Login logic natively mocking cookies sequentially 
    let res = await request(app).post("/api/v1/auth/login").send({ email: "admin@test.com", password: "password123" });
    adminCookie = res.headers["set-cookie"][0];

    res = await request(app).post("/api/v1/auth/login").send({ email: "analyst@test.com", password: "password123" });
    analystCookie = res.headers["set-cookie"][0];

    res = await request(app).post("/api/v1/auth/login").send({ email: "viewer@test.com", password: "password123" });
    viewerCookie = res.headers["set-cookie"][0];

    // Seed mock pipeline Records mimicking true mathematical data trees natively tracking active status fields
    await recordModel.create([
      { amount: 1000, type: TRANSACTION_TYPES.INCOME, category: "salary", date: new Date("2023-10-01"), createdBy: adminId },
      { amount: 500, type: TRANSACTION_TYPES.INCOME, category: "freelance", date: new Date("2023-10-15"), createdBy: adminId },
      { amount: 200, type: TRANSACTION_TYPES.EXPENSE, category: "food", date: new Date("2023-10-02"), createdBy: adminId },
      { amount: 300, type: TRANSACTION_TYPES.EXPENSE, category: "transport", date: new Date("2023-11-05"), createdBy: adminId },
      // This natively soft-deleted record explicitly MUST NOT be aggregated
      { amount: 5000, type: TRANSACTION_TYPES.INCOME, category: "salary", date: new Date("2023-10-01"), createdBy: adminId, deletedAt: new Date() },
    ]);
  });

  describe("GET /api/v1/analytics/summary", () => {
    it("should exactly return the natively calculated financial summary for an Admin accounting active fields only", async () => {
      const response = await request(app)
        .get("/api/v1/analytics/summary")
        .set("Cookie", adminCookie);

      expect(response.status).toBe(200);
      expect(response.body.data.totalIncome).toBe(1500); // 1000 + 500 (ignores 5000 actively)
      expect(response.body.data.totalExpense).toBe(500); // 200 + 300
      expect(response.body.data.netBalance).toBe(1000);   // 1500 - 500 natively calculated sequentially!
    });

    it("should allow an Analyst to access the summary natively natively parsing the RBAC hooks correctly", async () => {
      const response = await request(app)
        .get("/api/v1/analytics/summary")
        .set("Cookie", analystCookie);

      expect(response.status).toBe(200);
    });

    it("should strictly forbid a Viewer from accessing the mathematical computations", async () => {
      const response = await request(app)
        .get("/api/v1/analytics/summary")
        .set("Cookie", viewerCookie);

      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/v1/analytics/stats", () => {
    it("should natively extract category stats and grouped monthly trends intelligently without manual loops", async () => {
      const response = await request(app)
        .get("/api/v1/analytics/stats")
        .set("Cookie", adminCookie);

      expect(response.status).toBe(200);

      const { categoryStats, monthlyTrends } = response.body.data;

      expect(categoryStats).toBeDefined();
      expect(monthlyTrends).toBeDefined();

      // Check category logic mathematically executing strictly tracking non-deleted ones sequentially
      const salaryStat = categoryStats.find(stat => stat.category === "salary");
      expect(salaryStat.total).toBe(1000); // 1000 securely skips the 5000 deleted log

      // Check monthly trends date projections correctly formatting timestamps
      const octIncomeTrend = monthlyTrends.find(trend => trend.year === 2023 && trend.month === 10 && trend.type === TRANSACTION_TYPES.INCOME);
      expect(octIncomeTrend.total).toBe(1500); // 1000 + 500 properly hooked into chronological mappings
    });

    it("should strictly forbid an Analyst from scraping structural DB aggregation loops", async () => {
      const response = await request(app)
        .get("/api/v1/analytics/stats")
        .set("Cookie", analystCookie);

      expect(response.status).toBe(403);
    });

    it("should strictly forbid a Viewer from reading detailed stats logic explicitly blocking views", async () => {
      const response = await request(app)
        .get("/api/v1/analytics/stats")
        .set("Cookie", viewerCookie);

      expect(response.status).toBe(403);
    });
  });
});
