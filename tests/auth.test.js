import request from "supertest";
import app from "../src/app.js";
import userModel from "../src/models/user.model.js";
import { ROLES, STATUS } from "../src/utils/constants.util.js";
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

describe("Auth APIs", () => {
  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      // Seed a valid user for login testing
      await userModel.create({
        name: "Test Admin",
        email: "admin@test.com",
        password: "password123",
        role: ROLES.ADMIN,
        status: STATUS.ACTIVE,
      });
    });

    it("should login successfully with correct credentials", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "admin@test.com",
          password: "password123",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.token).toBeDefined();
      expect(response.header["set-cookie"]).toBeDefined();
    });

    it("should fail to login with non-existent email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "wrong@test.com",
          password: "password123",
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Incorrect email or password/i);
    });

    it("should fail to login with wrong password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "admin@test.com",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Incorrect email or password/i);
    });

    it("should fail validation with invalid email format", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "admintest.com",
          password: "password123",
        });

      // Handled natively by Zod validation middleware
      expect(response.status).toBe(400); 
    });
  });

  describe("POST /api/v1/auth/change-password", () => {
    let authCookie = "";

    beforeEach(async () => {
      // Seed a user
      await userModel.create({
        name: "Test Admin",
        email: "admin@test.com",
        password: "password123",
        role: ROLES.ADMIN,
        status: STATUS.ACTIVE,
      });

      // Login to get token cookie
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "admin@test.com", password: "password123" });
      
      authCookie = res.headers["set-cookie"][0];
    });

    it("should change password successfully with correct current password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Cookie", authCookie)
        .send({
          currentPassword: "password123",
          newPassword: "newsecurepassword456",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.token).toBeDefined();

      // Verify DB actually reflects updated password uniquely handled securely via hook
      const user = await userModel.findOne({ email: "admin@test.com" }).select("+password");
      const isMatch = await user.comparePassword("newsecurepassword456", user.password);
      expect(isMatch).toBe(true);
    });

    it("should fail to change password with incorrect current password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Cookie", authCookie)
        .send({
          currentPassword: "wrongpassword",
          newPassword: "newsecurepassword456",
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Incorrect current password/i);
    });

    it("should prevent access without authentication", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .send({
          currentPassword: "password123",
          newPassword: "newsecurepassword456",
        });

      expect(response.status).toBe(401); // Protect middleware explicitly blocks
    });

    it("should fail validation if fields are missing", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Cookie", authCookie)
        .send({
          newPassword: "newsecurepassword456",
        });

      expect(response.status).toBe(400); // Blocked natively via Zod framework
    });
  });
});
