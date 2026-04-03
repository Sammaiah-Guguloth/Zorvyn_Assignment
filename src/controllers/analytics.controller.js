import catchAsync from "../utils/catchAsync.util.js";
import * as analyticsService from "../services/analytics.service.js";

export const getSummary = catchAsync(async (req, res, next) => {
  const summary = await analyticsService.getSummaryData();
  
  res.status(200).json({
    status: "success",
    data: summary,
  });
});

export const getStats = catchAsync(async (req, res, next) => {
  const stats = await analyticsService.getStatsData();
  
  res.status(200).json({
    status: "success",
    data: stats,
  });
});
