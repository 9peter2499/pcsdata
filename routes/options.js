// routes/options.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

// --- GET: MasterOptions by group ---
router.get("/:group", async (req, res) => {
  const { group } = req.params;

  try {
    const { data, error } = await supabase
      .from("MasterOptions")
      .select("option_id, option_label, display_order")
      .eq("option_group", group)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
