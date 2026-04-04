import request from "supertest";
import app from "../src/app.js";
import userModel from "../src/models/user.model.js";
import { ROLES, STATUS } from "../src/utils/constants.util.js";
import { connectDB, disconnectDB, clearDB } from "./setup.js";
import * as emailService from "../src/services/email.service.js"; // To inspect mock calls

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

afterEach(async () => {
  await clearDB();
});

describe("Admin APIs", () => {
  let adminCookie = "";
  let analystCookie = "";
  let adminId = "";
  let analystId = "";

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

    // Seed Analyst specifically to aggressively test RBAC failure
    const analystUser = await userModel.create({
      name: "Test Analyst",
      email: "analyst@test.com",
      password: "password123",
      role: ROLES.ANALYST,
      status: STATUS.ACTIVE,
    });
    analystId = analystUser._id.toString();

    // Issue Mock Logins dynamically extracting native JWT cookies
    const adminRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@test.com", password: "password123" });
    adminCookie = adminRes.headers["set-cookie"][0];

    const analystRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "analyst@test.com", password: "password123" });
    analystCookie = analystRes.headers["set-cookie"][0];
  });

  describe("POST /api/v1/admin/users", () => {



    it("should allow an Admin to create a new user successfully", async () => {
      const response = await request(app)
        .post("/api/v1/admin/users")
        .set("Cookie", adminCookie)
        .send({
          name: "New Viewer",
          email: "viewer@test.com",
          role: ROLES.VIEWER,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.data.user.email).toBe("viewer@test.com");
      expect(response.body.data.user.role).toBe(ROLES.VIEWER);
      
      // Ensure the newly generated password is NOT sent statically back onto the client network
      expect(response.body.data.user.password).toBeUndefined();
      
      // Safety checking that our Model properly instantiated internally
      const dbUser = await userModel.findOne({ email: "viewer@test.com" });
      expect(dbUser).toBeDefined();
      expect(dbUser.isPasswordReset).toBe(false);
    });

    it("should strictly forbid an Analyst from creating a user", async () => {
      const response = await request(app)
        .post("/api/v1/admin/users")
        .set("Cookie", analystCookie)
        .send({
          name: "Sneaky User",
          email: "sneaky@test.com",
          role: ROLES.VIEWER,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/You do not have permission/i);
    });

    it("should fail natively via Zod validation if missing required fields", async () => {
      const response = await request(app)
        .post("/api/v1/admin/users")
        .set("Cookie", adminCookie)
        .send({
          name: "Invalid User",
          // explicitly omitting email
          role: ROLES.VIEWER,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/expected string, received undefined/i);
    });

    it("should fail validation specifically rejecting an invalid role mapping", async () => {
      const response = await request(app)
        .post("/api/v1/admin/users")
        .set("Cookie", adminCookie)
        .send({
          name: "Invalid User",
          email: "invalid@test.com",
          role: "superadmin", // explicitly fake role
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Invalid option:/i);
    });
  });

  describe("GET /api/v1/admin/users", () => {
    it("should allow Admin to fetch all users excluding themselves", async () => {
      const response = await request(app)
        .get("/api/v1/admin/users")
        .set("Cookie", adminCookie);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      
      const users = response.body.data.users;
      // Admin should not see themselves
      const containsAdmin = users.some(u => u.email === "admin@test.com");
      expect(containsAdmin).toBe(false);
      
      // But they should see the Analyst
      const containsAnalyst = users.some(u => u.email === "analyst@test.com");
      expect(containsAnalyst).toBe(true);
    });

    it("should strictly forbid an Analyst from fetching users", async () => {
      const response = await request(app)
        .get("/api/v1/admin/users")
        .set("Cookie", analystCookie);

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /api/v1/admin/users/:id/status", () => {
    it("should safely allow Admin to toggle a user's status", async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/users/${analystId}/status`)
        .set("Cookie", adminCookie)
        .send({ status: STATUS.INACTIVE });

      expect(response.status).toBe(200);
      expect(response.body.data.user.status).toBe(STATUS.INACTIVE);

      // Verify db
      const dbUser = await userModel.findById(analystId);
      expect(dbUser.status).toBe(STATUS.INACTIVE);
    });

    it("should fail natively preventing Admins from locking their own status", async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/users/${adminId}/status`)
        .set("Cookie", adminCookie)
        .send({ status: STATUS.INACTIVE });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/cannot change your own status/i);
    });

    it("should fail validation rejecting an invalid status string", async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/users/${analystId}/status`)
        .set("Cookie", adminCookie)
        .send({ status: "suspended" });

      expect(response.status).toBe(400); // Bad Request from Zod
    });
  });

  describe("DELETE /api/v1/admin/users/:id", () => {
    it("should safely allow Admin to delete a user", async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/users/${analystId}`)
        .set("Cookie", adminCookie);

      expect(response.status).toBe(204);

      // Verify db
      const dbUser = await userModel.findById(analystId);
      expect(dbUser).toBeNull();
    });

    it("should fail natively preventing Admins from deleting their own account", async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/users/${adminId}`)
        .set("Cookie", adminCookie);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/cannot delete your own account/i);
    });

    it("should strictly forbid an Analyst from deleting users", async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/users/${analystId}`)
        .set("Cookie", analystCookie);

      expect(response.status).toBe(403);
    });
    
    it("should return 404 if user not found", async () => {
      const fakeId = "5f8f8c44b6b6b71f9c8f9c12"; // Sample Mongo ObjectID
      const response = await request(app)
        .delete(`/api/v1/admin/users/${fakeId}`)
        .set("Cookie", adminCookie);

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/No user found with that ID/i);
    });
  });
});
