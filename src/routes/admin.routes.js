import express from "express";
import * as adminController from "../controllers/admin.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { restrictTo } from "../middlewares/role.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createUserSchema } from "../validations/user.validation.js";
import { ROLES } from "../utils/constants.util.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo(ROLES.ADMIN));

/**
 * @route   POST /api/v1/admin/users
 * @access  Private/Admin
 */
router.post("/users", validate(createUserSchema), adminController.createUser);

/**
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
router.get("/users", adminController.getAllUsers);

export default router;
