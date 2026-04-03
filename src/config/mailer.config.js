import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Mailer configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


// Verify Connection
export const verifyMailConnection = async () => {
  try {
    await transporter.verify();
    console.log("Mail Server is ready to take our messages");
  } catch (error) {
    console.error("Mail Server Connection Error:", error.message);
  }
};

export default transporter;
