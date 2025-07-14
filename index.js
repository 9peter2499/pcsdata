// 1. --- Import Packages ---
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const http = require("http");
const supabase = require("./supabaseClient");

// 2. --- App Setup ---
const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

// 3. --- Middleware ---

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests from this IP, please try again later." },
});

const allowedOrigins = ["https://dp-web-lyfe.onrender.com"];

app.use(express.json());
app.use("/api/", apiLimiter);

// 4. --- Helper & Middleware ---
const { addLog } = require("./services/logService");
const checkAdmin = require("./middlewares/checkAdmin");

// 5. --- API Routes ---
app.use("/api/log-action", require("./routes/log"));
app.use("/api/tors", require("./routes/tors"));
app.use("/api/tordetail", require("./routes/tordetail"));
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/worked", require("./routes/worked"));
app.use("/api/summary", require("./routes/summary"));
app.use("/api/options", require("./routes/options"));
app.use((req, res, next) => {
  console.log(`📥 Request: ${req.method} ${req.originalUrl}`);
  next();
});

// 6. --- Start Server ---
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ API Server is running on http://0.0.0.0:${PORT}`);
});
