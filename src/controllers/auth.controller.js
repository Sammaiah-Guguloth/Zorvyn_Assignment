import jwt from "jsonwebtoken";
import userModel from "../models/user.model.js";
import catchAsync from "../utils/catchAsync.util.js";
import AppError from "../utils/appError.util.js";
import { STATUS } from "../utils/constants.util.js";

// Helper to sign JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
};

// Function to send Token via Cookie
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        (process.env.JWT_COOKIE_EXPIRES_IN || 90) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  };

  // Security
  user.password = undefined;

  res.cookie("jwt", token, cookieOptions);

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // Find user & select password
  const user = await userModel.findOne({ email }).select("+password");

  // Verify user and password
  if (!user || !(await user.comparePassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // Account Status
  if (user.status !== STATUS.ACTIVE) {
    return next(
      new AppError("Your account is deactivated. Access denied.", 403)
    );
  }

  // 5. Send cookie and response
  createSendToken(user, 200, res);
});
