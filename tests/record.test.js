import request from "supertest";
import app from "../src/app.js";
import userModel from "../src/models/user.model.js";
import recordModel from "../src/models/record.model.js";
import { ROLES, STATUS, TRANSACTION_TYPES } from "../src/utils/constants.util.js";
import { connectDB, disconnectDB, clearDB } from "./setup.js";

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

afterEach(async () => {
  await clearDB();
});

describe("Record APIs", () => {
  let adminCookie = "";
  let analystCookie = "";
  let viewerCookie = "";
  let adminId = "";

  beforeEach(async () => {
    // Seed Admin
    const adminUser = await userModel.create({
      name: "Test Admin",
      email: "admin@test.com",
      password: "password123",
      role: ROLES.ADMIN,
      status: STATUS.ACTIVE,
    });
    adminId = adminUser._id.toString();

    // Seed Analyst
    await userModel.create({
      name: "Test Analyst",
      email: "analyst@test.com",
      password: "password123",
      role: ROLES.ANALYST,
      status: STATUS.ACTIVE,
    });

    // Seed Viewer
    await userModel.create({
      name: "Test Viewer",
      email: "viewer@test.com",
      password: "password123",
      role: ROLES.VIEWER,
      status: STATUS.ACTIVE,
    });

    const adminRes = await request(app).post("/api/v1/auth/login").send({ email: "admin@test.com", password: "password123" });
    adminCookie = adminRes.headers["set-cookie"][0];

    const analystRes = await request(app).post("/api/v1/auth/login").send({ email: "analyst@test.com", password: "password123" });
    analystCookie = analystRes.headers["set-cookie"][0];

    const viewerRes = await request(app).post("/api/v1/auth/login").send({ email: "viewer@test.com", password: "password123" });
    viewerCookie = viewerRes.headers["set-cookie"][0];
  });

  describe("POST /api/v1/records", () => {
    it("should allow an Admin to create a record", async () => {
      const response = await request(app)
        .post("/api/v1/records")
        .set("Cookie", adminCookie)
        .send({
          amount: 500,
          type: TRANSACTION_TYPES.INCOME,
          category: "salary",
          description: "Monthly salary",
        });

      expect(response.status).toBe(201);
      expect(response.body.data.record.amount).toBe(500);
      expect(response.body.data.record.createdBy.toString()).toBe(adminId);
    });

    it("should forbid an Analyst from creating a record", async () => {
      const response = await request(app)
        .post("/api/v1/records")
        .set("Cookie", analystCookie)
        .send({ amount: 100, type: TRANSACTION_TYPES.EXPENSE, category: "food" });

      expect(response.status).toBe(403);
    });

    it("should fail validation for negative amount", async () => {
      const response = await request(app)
        .post("/api/v1/records")
        .set("Cookie", adminCookie)
        .send({ amount: -50, type: TRANSACTION_TYPES.EXPENSE, category: "food" });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Amount must be positive/i);
    });
  });

  describe("GET /api/v1/records", () => {
    beforeEach(async () => {
      await recordModel.create([
        { amount: 100, type: TRANSACTION_TYPES.EXPENSE, category: "food", description: "Lunch", createdBy: adminId },
        { amount: 200, type: TRANSACTION_TYPES.EXPENSE, category: "transport", description: "Bus", createdBy: adminId },
        { amount: 1000, type: TRANSACTION_TYPES.INCOME, category: "salary", createdBy: adminId },
      ]);
    });

    it("should allow a Viewer to list all active records", async () => {
      const response = await request(app)
        .get("/api/v1/records")
        .set("Cookie", viewerCookie);

      expect(response.status).toBe(200);
      expect(response.body.results).toBe(3); // Expecting exactly 3 hits natively
    });

    it("should correctly filter records specifically by category query parameter", async () => {
      const response = await request(app)
        .get("/api/v1/records?category=food")
        .set("Cookie", analystCookie);

      expect(response.status).toBe(200);
      expect(response.body.results).toBe(1);
      expect(response.body.data.records[0].category).toBe("food");
    });
  });

  describe("PATCH /api/v1/records/:id", () => {
    let recordId;
    beforeEach(async () => {
      const record = await recordModel.create({
        amount: 100, type: TRANSACTION_TYPES.EXPENSE, category: "food", createdBy: adminId
      });
      recordId = record._id.toString();
    });

    it("should smartly allow an Admin to partially update a record without disrupting missing keys", async () => {
      const response = await request(app)
        .patch(`/api/v1/records/${recordId}`)
        .set("Cookie", adminCookie)
        .send({ amount: 150 }); // Omitting other keys entirely!

      expect(response.status).toBe(200);
      expect(response.body.data.record.amount).toBe(150);
      expect(response.body.data.record.category).toBe("food"); // Preserved!
    });

    it("should strictly forbid a Viewer from mutating records", async () => {
      const response = await request(app)
        .patch(`/api/v1/records/${recordId}`)
        .set("Cookie", viewerCookie)
        .send({ amount: 150 });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/records/:id", () => {
    let recordId;
    beforeEach(async () => {
      const record = await recordModel.create({
        amount: 200, type: TRANSACTION_TYPES.EXPENSE, category: "food", createdBy: adminId
      });
      recordId = record._id.toString();
    });

    it("should natively trigger a soft-delete mechanism hiding items without scrubbing analytics history", async () => {
      const response = await request(app)
        .delete(`/api/v1/records/${recordId}`)
        .set("Cookie", adminCookie);

      expect(response.status).toBe(204);

      // Verify db genuinely preserved the object logging deleted bounds securely
      const dbRecord = await recordModel.findById(recordId);
      expect(dbRecord.deletedAt).not.toBeNull();
      expect(dbRecord.deletedBy.toString()).toBe(adminId);
    });
  });
});
