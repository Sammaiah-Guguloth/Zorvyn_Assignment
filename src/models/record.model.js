import mongoose from "mongoose";
import { TRANSACTION_TYPES } from "../utils/constants.util.js";

const recordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be a positive value"],
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: [true, "Type (income/expense) is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // For Soft Delete
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Performance: Indexing for faster filtering of active records and dashboard trends
recordSchema.index({ deletedAt: 1, type: 1, date: -1 });

const Record = mongoose.model("Record", recordSchema);
export default Record;
