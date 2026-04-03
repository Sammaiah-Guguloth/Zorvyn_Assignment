import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../src/models/user.model.js";
import connectToDB from "../src/config/db.config.js";
import { ROLES, STATUS } from "../src/utils/constants.util.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    // Establish Database Connection
    await connectToDB();

    console.log("Checking for existing System Admin...");

    // Prevent duplicate Admin creation
    const adminExists = await userModel.findOne({ role: ROLES.ADMIN });

    if (adminExists) {
      console.log("⚠️  Admin already exists in the database. Skipping seed.");
      process.exit(0);
    }

    // console.log(process.env.ADMIN_EMAIL);

    // Create the Initial Admin
    const admin = await userModel.create({
      name: "System Admin",
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: ROLES.ADMIN,
      status: STATUS.ACTIVE,
      isPasswordReset: true,
    });

    console.log(`Success: Admin created successfully [Email: ${admin.email}]`);
    process.exit(0);
  } catch (error) {
    console.error(`Critical Error during seeding: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
