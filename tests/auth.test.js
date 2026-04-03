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
});
