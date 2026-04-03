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
