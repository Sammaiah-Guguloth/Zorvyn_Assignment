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

// Controller for updating a financial record
export const updateRecord = catchAsync(async (req, res, next) => {
  const record = await recordModel.findOne({ _id: req.params.id, deletedAt: null });

  if (!record) {
    return next(new AppError("No active record found with that ID", 404));
  }

  const updatedRecord = await recordModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: {
      record: updatedRecord,
    },
  });
});

// Controller for soft deleting a financial record
export const deleteRecord = catchAsync(async (req, res, next) => {
  const record = await recordModel.findOne({ _id: req.params.id, deletedAt: null });

  if (!record) {
    return next(new AppError("No active record found with that ID", 404));
  }

  // Soft Delete logic
  record.deletedAt = Date.now();
  record.deletedBy = req.user.id;
  await record.save();

  res.status(204).json({
    status: "success",
    data: null,
  });
});
