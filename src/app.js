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
app.use(cors());

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
