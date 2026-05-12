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
// import { v2 as cloudinary } from "cloudinary";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // POST /api/sign-upload
// app.post("/api/sign-upload", (req, res) => {
//   const timestamp = Math.round(Date.now() / 1000);

//   const paramsToSign = {
//     timestamp,
//     folder: "notion-editor", // optional — organise uploads
//     // eager: 'c_limit,w_1200',   // optional — transform on upload
//   };

//   const signature = cloudinary.utils.api_sign_request(
//     paramsToSign,
//     process.env.CLOUDINARY_API_SECRET
//   );

//   res.json({
//     signature,
//     timestamp,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     folder: "notion-editor",
//   });
// });
// =======================================================

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── 1. Sign Upload ─────────────────────────────────────────────────────────
// Client calls this BEFORE uploading so Cloudinary knows it's authenticated.
// We set `access_control: authenticated` so the asset is private by default.
app.post("/api/sign-upload", (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign = {
    timestamp,
    folder: "notion-editor",
    type: "private", // ← this is the key param
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
    type: "private", // ← send to client so it uses the right upload URL
  });
});

// // ── 2. Generate Temporary Signed URL ──────────────────────────────────────
// // Client sends public_id → server returns a URL valid for 5 minutes.
// // The URL is generated entirely server-side; the private asset never gets
// // a permanent public URL.
// app.post("/api/get-image-url", (req, res) => {
//   const { public_id } = req.body;

//   if (!public_id) {
//     return res.status(400).json({ error: "public_id is required" });
//   }

//   // sign_url: true + expires_at = Cloudinary generates a short-lived URL
//   const signedUrl = cloudinary.url(public_id, {
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
//     sign_url: true,
//     type: "authenticated", // ← must match upload type
//     expires_at: Math.round(Date.now() / 1000) + 60 * 5, // 5 minutes
//     secure: true,
//   });

//   res.json({ url: signedUrl });
// });

// POST /api/get-image-url  — use private_download_url instead of cloudinary.url
app.post("/api/get-image-url", (req, res) => {
  const { public_id } = req.body;
  if (!public_id)
    return res.status(400).json({ error: "public_id is required" });

  // const expires_at = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
  const expires_at = Math.floor(Date.now() / 1000) + 3 * 60; // 3 mins for check

  const url = cloudinary.utils.private_download_url(public_id, "jpg", {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET, // ← add these
    resource_type: "image",
    type: "private",
    expires_at,
  });

  res.json({ url });
});

// =====================================================

// ================= AI Endpoint using Gemini for Notion like editor ================

import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { generateText } from "ai";

app.post("/api/ai/command", async (req, res) => {
  console.log("req came to /command");
  const { messages } = req.body;

  try {
    // Normalize messages from Plate AI format to Vercel AI SDK CoreMessage format
    const coreMessages = messages.map((m) => ({
      role: m.role,
      content: m.content ?? m.parts,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const result = streamText({
      model: google("gemini-3-flash-preview"),
      messages: coreMessages,
      system: `You are a helpful writing assistant inside a rich text editor.
Help users write, edit, improve, and summarize content.
Respond in markdown format.`,
    });

    const dataStreamResponse = result.toUIMessageStreamResponse();

    // Copy headers from Web Response to Express Response
    dataStreamResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Pipe the Web Stream to Express Response
    const reader = dataStreamResponse.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }

    res.end();
  } catch (error) {
    console.error("AI Command Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process AI command" });
    }
  }
});

app.post("/api/ai/copilot", async (req, res) => {
  const { prompt, system } = req.body;

  console.log("req came to /copilot");

  try {
    const result = await generateText({
      model: google("gemini-3-flash-preview"),
      prompt,
      system,
      maxOutputTokens: 1000, // Increased limit
      temperature: 0.7,
      abortSignal: req.signal,
    });

    res.json({ text: result.text }); // Explicitly return the text field
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(408).json(null);
    }
    console.log("error : ", error);
    res.status(500).json({ error: "Failed to process copilot request" });
  }
});

// ========================================================================

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
