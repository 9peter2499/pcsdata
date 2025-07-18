const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Presentation")
      .select("ptt_date")
      .not("ptt_date", "is", null)
      .order("ptt_date", { ascending: false });

    if (error) throw error;

    const uniqueDates = [...new Set(data.map((item) => item.ptt_date))];
    res.status(200).json(uniqueDates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
