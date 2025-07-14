// routes/tors.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const checkAdmin = require("../middlewares/checkAdmin");
const { addLog } = require("../services/logService");

// --- GET: Single TOR by ID (The Final Version) ---
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Step 1: ดึงข้อมูลหลักของ TORs
    const { data: torData, error: torError } = await supabase
      .from("TORs")
      .select(`*, Modules(*)`)
      .eq("tor_id", id)
      .single();

    if (torError) throw new Error(`Error fetching TORs: ${torError.message}`);
    if (!torData) return res.status(404).json({ error: "TOR not found" });

    // Step 2: ดึงข้อมูล TORDetail
    const { data: detailData, error: detailError } = await supabase
      .from("TORDetail")
      .select(`*`)
      .eq("tord_id", id);

    if (detailError)
      throw new Error(`Error fetching TORDetail: ${detailError.message}`);

    // ถ้าไม่มีข้อมูล Detail ให้ส่งข้อมูลหลักกลับไปเลย
    if (!detailData || detailData.length === 0) {
      torData.TORDetail = [];
      return res.status(200).json(torData);
    }

    const detailObject = detailData[0];

    // Step 3: ดึงข้อมูลที่เกี่ยวข้องทั้งหมดพร้อมกันโดยใช้ Promise.all
    const [
      { data: feedbackData, error: feedbackError },
      { data: workedData, error: workedError },
      { data: presentationItemsData, error: pttItemsError },
    ] = await Promise.all([
      supabase.from("PATFeedback").select("*").eq("tord_id", id),
      supabase.from("PCSWorked").select("*").eq("tord_id", id),
      supabase
        .from("PresentationItems")
        .select("*, Presentation(*)")
        .eq("tord_id", id),
    ]);

    if (feedbackError)
      throw new Error(`Error fetching PATFeedback: ${feedbackError.message}`);
    if (workedError)
      throw new Error(`Error fetching PCSWorked: ${workedError.message}`);
    if (pttItemsError)
      throw new Error(
        `Error fetching PresentationItems: ${pttItemsError.message}`
      );

    // Step 4: ประกอบร่างข้อมูลทั้งหมด
    detailObject.PATFeedback = feedbackData || [];
    detailObject.PCSWorked = workedData || [];
    detailObject.PresentationItems = presentationItemsData || [];
    torData.TORDetail = [detailObject];

    res.status(200).json(torData);
  } catch (error) {
    console.error(
      `[API CATCH] เกิดข้อผิดพลาดสำหรับ TOR ID ${id}:`,
      error.message
    );
    res.status(500).json({ error: error.message });
  }
});

// --- PUT: Update TOR ---
// (ส่วนนี้ทำงานถูกต้องแล้ว ไม่ต้องแก้ไข)
router.put("/:id", checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { tor_status_id, tor_fixing_id } = req.body;

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
