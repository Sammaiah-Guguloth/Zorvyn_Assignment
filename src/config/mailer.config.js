import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Verify Connection
 * This is a professional touch: It checks if the SMTP configuration
 * is correct when the server starts, rather than failing later
 * when an Admin tries to create a user.
 */
export const verifyMailConnection = async () => {
  try {
    await transporter.verify();
    console.log("📧 Mail Server is ready to take our messages");
  } catch (error) {
    console.error("❌ Mail Server Connection Error:", error.message);
    // We don't process.exit(1) here because the app can still function
    // without email, but we log the critical error for the Admin.
  }
};

export default transporter;
