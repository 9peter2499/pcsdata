// 1. --- Import Packages ---
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const supabase = require('./supabaseClient');

// 2. --- App Setup ---
const app = express();
const port = process.env.PORT || 3000;

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP, please try again later.' }
});

app.use(cors());
app.use(express.json());
app.use('/api/', apiLimiter);

// 3. --- Helper & Middleware ---
const { addLog } = require('./services/logService');
const checkAdmin = require('./middlewares/checkAdmin');

// 4. --- API Routes ---
app.use('/api/log-action', require('./routes/log'));
app.use('/api/tors', require('./routes/tors'));
app.use('/api/tordetail', require('./routes/tordetail'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/worked', require('./routes/worked'));
app.use('/api/summary', require('./routes/summary'));

// 5. --- Start The Server ---
app.listen(port, () => {
    console.log(`✅ API Server is running at http://localhost:${port}`);
});
