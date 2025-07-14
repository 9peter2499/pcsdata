// routes/tors.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const checkAdmin = require("../middlewares/checkAdmin");

// --- GET: All TORs ---
// (ส่วนนี้เหมือนเดิม ไม่ต้องแก้ไข)
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("TORs").select(`
        *,
        Modules(*),
        tor_status_option:MasterOptions!fk_tor_status(option_label),
        tor_fixing_option:MasterOptions!fk_tor_fixing(option_label)
      `);
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- GET: Single TOR by ID (with All Details) ---
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // 1. ดึงข้อมูลหลักของ TORs ก่อน
    const { data: torData, error: torError } = await supabase
      .from("TORs")
      .select(
        `
        *,
        Modules(*),
        tor_status_option:MasterOptions!fk_tor_status(option_label),
        tor_fixing_option:MasterOptions!fk_tor_fixing(option_label)
        `
      )
      .eq("tor_id", id)
      .single();

    if (torError) throw torError;
    if (!torData) return res.status(404).json({ error: "TOR not found" });

    // 2. ดึงข้อมูล TORDetail ที่เกี่ยวข้อง
    const { data: detailData, error: detailError } = await supabase
      .from("TORDetail")
      .select(`*, PATFeedback(*), PCSWorked(*)`)
      .eq("tord_id", id);

    if (detailError) throw detailError;

    // 3. ดึงข้อมูล Presentation ที่เกี่ยวข้อง (ถ้ามี TORDetail)
    if (detailData && detailData.length > 0) {
      const { data: presentationItems, error: pttError } = await supabase
        .from("PresentationItems")
        .select(`*, Presentation(*)`)
        .eq("tord_id", id);

      if (pttError) throw pttError;

      // นำข้อมูล Presentation ไปใส่ใน TORDetail
      detailData[0].PresentationItems = presentationItems || [];
    }

    // 4. ประกอบร่างข้อมูลทั้งหมดกลับเข้าไปใน torData
    torData.TORDetail = detailData || [];

    // 5. ส่งข้อมูลที่ประกอบร่างเสร็จแล้วกลับไป
    res.status(200).json(torData);
  } catch (error) {
    console.error("Error fetching TOR detail:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- PUT: Update TOR ---
router.put("/:id", checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { tor_status_id, tor_fixing_id } = req.body;

  // Basic validation
  if (!tor_status_id || typeof tor_status_id !== "string") {
    return res
      .status(400)
      .json({ error: "tor_status_id is required and must be a string" });
  }
  if (!tor_fixing_id || typeof tor_fixing_id !== "string") {
    return res
      .status(400)
      .json({ error: "tor_fixing_id is required and must be a string" });
  }

  try {
    const { data: oldData } = await supabase
      .from("TORs")
      .select("tor_status_id, tor_fixing_id")
      .eq("tor_id", id)
      .single();

    const { data, error } = await supabase
      .from("TORs")
      .update({
        tor_status_id,
        tor_fixing_id,
        updated_by: req.user.id,
        updated_at: new Date(),
      })
      .eq("tor_id", id)
      .select()
      .single();

    if (error) throw error;

    await addLog(req.user.id, "UPDATE_TOR", {
      tor_id: id,
      changes: {
        status: { from: oldData.tor_status_id, to: tor_status_id },
        fixing: { from: oldData.tor_fixing_id, to: tor_fixing_id },
      },
    });

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
