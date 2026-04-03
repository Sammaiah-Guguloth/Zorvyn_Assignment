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
    { returnDocument: 'after', runValidators: true }
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

// Controller for fetching and filtering records natively
export const getAllRecords = catchAsync(async (req, res, next) => {
  const { category, type, startDate, endDate, search, page = 1, limit = 10 } = req.query;

  // Enforce excluding logically deleted entries globally
  const query = { deletedAt: null };

  if (category) query.category = category;
  if (type) query.type = type;

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Soft fuzzy index matching for generic text searches
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const records = await recordModel
    .find(query)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit * 1)
    .populate("createdBy", "name email role");

  const total = await recordModel.countDocuments(query);

  res.status(200).json({
    status: "success",
    results: records.length,
    pagination: {
      total,
      page: page * 1,
      pages: Math.ceil(total / limit),
    },
    data: {
      records,
    },
  });
});
