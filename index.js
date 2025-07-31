// 1. --- Import Packages ---
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
http = require("http");
const supabase = require("./supabaseClient");

// 2. --- App Setup ---
const app = express();
app.set("trust proxy", 1); // เชื่อใจ Proxy ของ Render
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

// 3. --- Middleware ---

// ✅ --- ย้าย allowedOrigins มาประกาศไว้ก่อนใช้งาน ---
const allowedOrigins = [
  "https://dp-web-lyfe.onrender.com",
  // ใส่ URL อื่นๆ ที่ต้องการอนุญาตได้ที่นี่ เช่น localhost สำหรับทดสอบ
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

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

//app.use(express.json());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

//app.use("/api/", apiLimiter);

// 4. --- Helper & Middleware ---
const { addLog } = require("./services/logService");
const checkAdmin = require("./middlewares/checkAdmin");

// 5. --- API Routes ---

// ✅ --- เพิ่ม Route สำหรับ Health Check ที่ Root URL ---
app.get("/", (req, res) => {
  res.send("PCS API is alive and running! 🎉");
});

// app.use("/api/log-action", require("./routes/log"));
// console.log("✅ Mounting /api/tors route...");
// app.use("/api/tors", require("./routes/tors"));
// app.use("/api/tordetail", require("./routes/tordetail"));
// app.use("/api/feedback", require("./routes/feedback"));
// app.use("/api/worked", require("./routes/worked"));
// app.use("/api/summary", require("./routes/summary"));
// app.use("/api/options", require("./routes/options"));
// app.use("/api/presentation", require("./routes/presentation"));
// app.use("/api/presentation/dates", require("./routes/presentationDates"));
// app.use(
//   "/api/presentation/last-updated",
//   require("./routes/presentationLastUpdated")
// );

app.use("/api/log-action", apiLimiter, require("./routes/log"));
console.log("✅ Mounting /api/tors route...");
app.use("/api/tors", apiLimiter, require("./routes/tors"));
app.use("/api/tordetail", apiLimiter, require("./routes/tordetail"));
app.use("/api/feedback", apiLimiter, require("./routes/feedback"));
app.use("/api/worked", apiLimiter, require("./routes/worked"));
app.use("/api/summary", apiLimiter, require("./routes/summary"));
app.use("/api/options", apiLimiter, require("./routes/options"));
app.use("/api/presentation", apiLimiter, require("./routes/presentation"));
app.use(
  "/api/presentation/dates",
  apiLimiter,
  require("./routes/presentationDates")
);
app.use(
  "/api/presentation/last-updated",
  apiLimiter,
  require("./routes/presentationLastUpdated")
);

app.use((req, res, next) => {
  console.log(`📥 Request: ${req.method} ${req.originalUrl}`);
  next();
});

// 6. --- Start Server ---
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ API Server is running on http://0.0.0.0:${PORT}`);
});
