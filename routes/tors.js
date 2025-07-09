// routes/tors.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const checkAdmin = require("../middlewares/checkAdmin");
const { addLog } = require("../services/logService");

// --- GET: All TORs ---
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("TORs").select("*, Modules(*)");
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- GET: Single TOR by ID ---
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("TORs")
      .select(`*, Modules(*), TORDetail(*, PATFeedback(*), PCSWorked(*))`)
      .eq("tor_id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116")
        return res.status(404).json({ error: "TOR not found" });
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PUT: Update TOR ---
router.put("/:id", checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { tor_status, tor_fixing } = req.body;

  if (!tor_status || typeof tor_status !== "string") {
    return res
      .status(400)
      .json({ error: "tor_status is required and must be a string" });
  }
  if (tor_fixing === undefined) {
    return res.status(400).json({ error: "tor_fixing is required" });
  }

  try {
    const { data: oldData } = await supabase
      .from("TORs")
      .select("tor_status, tor_fixing")
      .eq("tor_id", id)
      .single();

    const { data, error } = await supabase
      .from("TORs")
      .update({
        tor_status,
        tor_fixing,
        updated_by: req.user.id, // ✅ เพิ่มบรรทัดนี้
        updated_at: new Date(),
      })
      .eq("tor_id", id)
      .select()
      .single();

    if (error) throw error;

    await addLog(req.user.id, "UPDATE_TOR", {
      tor_id: id,
      changes: {
        status: { from: oldData.tor_status, to: tor_status },
        fixing: { from: oldData.tor_fixing, to: tor_fixing },
      },
    });

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
