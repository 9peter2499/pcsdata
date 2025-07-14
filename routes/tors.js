// routes/tors.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const checkAdmin = require("../middlewares/checkAdmin");
const { addLog } = require("../services/logService");

// --- GET: All TORs --- (ส่วนนี้ทำงานถูกต้องแล้ว)
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

// --- GET: Single TOR by ID (Step 4: เพิ่ม PresentationItems) ---
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`[API] Step 4: กำลังดึงข้อมูลสำหรับ TOR ID: ${id}`);

  try {
    // ดึงข้อมูลหลักของ TORs
    const { data: torData, error: torError } = await supabase
      .from("TORs")
      .select(`*`)
      .eq("tor_id", id)
      .single();

    if (torError) throw torError;
    if (!torData) return res.status(404).json({ error: "TOR not found" });

    // ดึงข้อมูล TORDetail
    const { data: detailData, error: detailError } = await supabase
      .from("TORDetail")
      .select(`*`)
      .eq("tord_id", id);

    if (detailError) throw detailError;

    // ถ้าไม่มีข้อมูล Detail ให้ส่งข้อมูลหลักกลับไปเลย
    if (!detailData || detailData.length === 0) {
      torData.TORDetail = [];
      return res.status(200).json(torData);
    }

    const detailObject = detailData[0];

    // ดึงข้อมูล Feedback และ Worked
    const { data: feedbackData, error: feedbackError } = await supabase
      .from("PATFeedback")
      .select("*")
      .eq("tord_id", id);
    if (feedbackError) throw feedbackError;

    const { data: workedData, error: workedError } = await supabase
      .from("PCSWorked")
      .select("*")
      .eq("tord_id", id);
    if (workedError) throw workedError;

    // --- ส่วนที่เพิ่มเข้ามา ---
    // ดึงข้อมูล PresentationItems และข้อมูล Presentation ที่เชื่อมกันอยู่
    const { data: presentationItems, error: pttError } = await supabase
      .from("PresentationItems")
      .select(`*, Presentation(*)`) // Query ที่อาจเป็นปัญหา
      .eq("tord_id", id);

    if (pttError) throw pttError;
    // --- สิ้นสุดส่วนที่เพิ่มเข้ามา ---

    // ประกอบร่างข้อมูลทั้งหมด
    detailObject.PATFeedback = feedbackData || [];
    detailObject.PCSWorked = workedData || [];
    detailObject.PresentationItems = presentationItems || []; // เพิ่มข้อมูลใหม่เข้าไป

    torData.TORDetail = [detailObject];

    console.log(`[API] Step 4: ดึงข้อมูลสำเร็จ. กำลังส่งข้อมูลกลับ...`);
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
