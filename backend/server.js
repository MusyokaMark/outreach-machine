import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import cookieParser from "cookie-parser";
import leadsRouter from "./routes/leads.js";
import messagesRouter from "./routes/messages.js";
import outreachRouter from "./routes/outreach.js";
import authRouter from "./routes/auth.js";
import { setupPassport } from "./services/auth.js";
import { startFollowUpScheduler } from "./services/scheduler.js";

dotenv.config();

console.log("Email user:", process.env.EMAIL_USER);
console.log(
  "Email pass length:",
  process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : "NOT SET",
);

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);

app.use(passport.initialize());
app.use(passport.session());

setupPassport();

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    retryWrites: true,
  })
  .then(() => {
    console.log("MongoDB connected");
    startFollowUpScheduler();
  })
  .catch((err) => console.error("MongoDB error:", err));

app.get("/", (req, res) => {
  res.json({ status: "Outreach Machine API is running" });
});

app.use("/auth", authRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/outreach", outreachRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
