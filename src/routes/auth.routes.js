import express from "express";
import * as authController from "../controllers/auth.controller.js";
import validate from "../middlewares/validate.middleware.js";
import { loginSchema } from "../validations/user.validation.js";

const router = express.Router();

/**
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
router.post("/login", validate(loginSchema), authController.login);

export default router;
