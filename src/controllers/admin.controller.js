import userModel from "../models/user.model.js";
import catchAsync from "../utils/catchAsync.util.js";
import AppError from "../utils/appError.util.js";
import { sendOnboardingEmail } from "../services/email.service.js";


// Helper function to generate temporary password
const generateTempPassword = () => {
  return Math.random().toString(36).slice(-8);
};

// Controller for creating user
export const createUser = catchAsync(async (req, res, next) => {
  const { name, email, role } = req.body;

  const tempPassword = generateTempPassword();

  const newUser = await userModel.create({
    name,
    email,
    role,
    password: tempPassword,
    isPasswordReset: false,
  });

  try {
    const message = `Hello ${name},\n\nYour account has been created successfully.\n\nYour Email: ${email}\nYour Temporary Password: ${tempPassword}\n\nPlease log in and change your password immediately.`;

    await sendOnboardingEmail({
      email: newUser.email,
      subject: "Welcome to Finance Dashboard - Your Account Credentials",
      message,
    });
  } catch (err) {
    console.error("Error sending email", err);
  }

  newUser.password = undefined;

  res.status(201).json({
    status: "success",
    data: {
      user: newUser,
    },
  });
});

// Controller to get all users
export const getAllUsers = catchAsync(async (req, res, next) => {
  // Exclude the current admin from the returned list of users
  const users = await userModel.find({ _id: { $ne: req.user.id } }).select("-password");

  res.status(200).json({
    status: "success",
    results: users.length,
    data: {
      users,
    },
  });
});

// Controller to toggle user status
export const updateUserStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const user = await userModel.findById(req.params.id);

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  if (user.id === req.user.id) {
    return next(new AppError("You cannot change your own status", 400));
  }

  user.status = status;
  await user.save();

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// Controller to delete a user
export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await userModel.findById(req.params.id);

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  if (user.id === req.user.id) {
    return next(new AppError("You cannot delete your own account", 400));
  }

  await userModel.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});
