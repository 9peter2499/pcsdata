// routes/presentationLastUpdated.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

// --- GET: Last Updated Date ---
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Presentation")
      .select("ptt_date")
      .not("ptt_date", "is", null)
      .order("ptt_date", { ascending: false })
      .limit(1)
      .single(); // ดึงแค่แถวเดียว

    if (error) throw error;

    res.status(200).json({ latestDate: data.ptt_date });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
