import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import globalErrorHandler from "./middlewares/error.middleware.js";
import AppError from "./utils/appError.util.js";

import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import recordRoutes from "./routes/record.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
const app = express();

// GLOBAL MIDDLEWARES
app.use(helmet());
// app.use(cors());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate Limiting
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Body and cookie parser
app.use(express.json());
app.use(cookieParser());

// Static Folder
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../public")));

// Landing Page Route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

// ROUTES
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/records", recordRoutes);
app.use("/api/v1/analytics", analyticsRoutes);

const allowedOrigins = [
  "http://localhost:5173",
  "https://notion-like-editor-flame.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
  })
);

// For the Notion like editor
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/sign-upload
app.post("/api/sign-upload", (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign = {
    timestamp,
    folder: "notion-editor", // optional — organise uploads
    // eager: 'c_limit,w_1200',   // optional — transform on upload
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    signature,
    timestamp,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    folder: "notion-editor",
  });
});

// Swagger Documentation Route
import swaggerUi from "swagger-ui-express";
import swaggerDocs from "./config/swagger.config.js";
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// For undefined Routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

export default app;
