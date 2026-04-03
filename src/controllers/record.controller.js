import recordModel from "../models/record.model.js";
import catchAsync from "../utils/catchAsync.util.js";
import AppError from "../utils/appError.util.js";

// Controller for creating a financial record
export const createRecord = catchAsync(async (req, res, next) => {
  const newRecord = await recordModel.create({
    ...req.body,
    createdBy: req.user.id,
  });

  res.status(201).json({
    status: "success",
    data: {
      record: newRecord,
    },
  });
});
