import express from "express";
import * as authController from "../controllers/auth.controller.js";
import validate from "../middlewares/validate.middleware.js";
import { loginSchema, changePasswordSchema } from "../validations/user.validation.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
router.post("/login", validate(loginSchema), authController.login);

/**
 * @route   POST /api/v1/auth/change-password
 * @access  Private
 */
router.post(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
