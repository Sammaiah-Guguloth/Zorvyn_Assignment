import express from "express";
import * as recordController from "../controllers/record.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { restrictTo } from "../middlewares/role.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createRecordSchema, updateRecordSchema } from "../validations/record.validation.js";
import { ROLES } from "../utils/constants.util.js";

const router = express.Router();

router.use(protect);

/**
 * @route   POST /api/v1/records
 * @desc    Create a record
 * @access  Private (Admin Only)
 */
router.post(
  "/",
  restrictTo(ROLES.ADMIN),
  validate(createRecordSchema),
  recordController.createRecord
);

/**
 * @route   PATCH /api/v1/records/:id
 * @desc    Update a record
 * @access  Private (Admin Only)
 */
router.patch(
  "/:id",
  restrictTo(ROLES.ADMIN),
  validate(updateRecordSchema),
  recordController.updateRecord
);

export default router;
