// routes/options.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

// --- GET: MasterOptions by group ---
router.get("/", async (req, res) => {
  const group = req.query.group;

  console.log("🔍 option group = ", group);

  if (!group) return res.status(400).json({ error: "Missing option group" });

  try {
    const { data, error } = await supabase
      .from("MasterOptions")
      .select("option_id, option_label, display_order")
      .ilike("option_group", group) // ✅ ตรงนี้แก้
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
