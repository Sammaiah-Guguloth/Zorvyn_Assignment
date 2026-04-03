import recordModel from "../models/record.model.js";
import { TRANSACTION_TYPES } from "../utils/constants.util.js";

export const getSummaryData = async () => {
  const summary = await recordModel.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ["$type", TRANSACTION_TYPES.INCOME] }, "$amount", 0],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ["$type", TRANSACTION_TYPES.EXPENSE] }, "$amount", 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalIncome: 1,
        totalExpense: 1,
        netBalance: { $subtract: ["$totalIncome", "$totalExpense"] },
      },
    },
  ]);

  return summary[0] || { totalIncome: 0, totalExpense: 0, netBalance: 0 };
};

export const getStatsData = async () => {
  const categoryStats = await recordModel.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: { type: "$type", category: "$category" },
        total: { $sum: "$amount" },
      },
    },
    {
      $sort: { total: -1 }
    },
    {
      $project: {
        _id: 0,
        type: "$_id.type",
        category: "$_id.category",
        total: 1,
      },
    },
  ]);

  const monthlyTrends = await recordModel.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: {
          type: "$type",
          year: { $year: "$date" },
          month: { $month: "$date" },
        },
        total: { $sum: "$amount" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
    {
      $project: {
        _id: 0,
        type: "$_id.type",
        year: "$_id.year",
        month: "$_id.month",
        total: 1,
      },
    },
  ]);

  return { categoryStats, monthlyTrends };
};
