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

// --- GET: Single TOR by ID (The Definitive Version) ---
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`[API] Final Version: กำลังดึงข้อมูลสำหรับ TOR ID: ${id}`);

  try {
    // Step 1: ดึงข้อมูลหลักของ TORs
    const { data: torData, error: torError } = await supabase
      .from("TORs")
      .select(`*`)
      .eq("tor_id", id)
      .single();

    if (torError) throw torError;
    if (!torData) return res.status(404).json({ error: "TOR not found" });

    // Step 2: ดึงข้อมูล TORDetail
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

    // Step 3: ดึงข้อมูล Feedback และ Worked
    const { data: feedbackData } = await supabase
      .from("PATFeedback")
      .select("*")
      .eq("tord_id", id);
    const { data: workedData } = await supabase
      .from("PCSWorked")
      .select("*")
      .eq("tord_id", id);

    // --- ส่วนที่แก้ไข ---
    // Step 4: ดึงข้อมูล PresentationItems และ Presentation แยกกัน
    const { data: presentationItems, error: pttItemsError } = await supabase
      .from("PresentationItems")
      .select(`*`)
      .eq("tord_id", id);

    if (pttItemsError) throw pttItemsError;

    if (presentationItems && presentationItems.length > 0) {
      // ดึง ptt_id ทั้งหมดออกมา
      const presentationIds = presentationItems.map((item) => item.ptti_id);

      // ดึงข้อมูลจากตาราง Presentation ที่มี id ตรงกัน
      const { data: presentations, error: pttError } = await supabase
        .from("Presentation")
        .select("*")
        .in("ptt_id", presentationIds);

      if (pttError) throw pttError;

      // นำข้อมูล Presentation กลับไปรวมกับ PresentationItems
      presentationItems.forEach((item) => {
        item.Presentation =
          presentations.find((p) => p.ptt_id === item.ptti_id) || null;
      });
    }
    // --- สิ้นสุดส่วนที่แก้ไข ---

    // Step 5: ประกอบร่างข้อมูลทั้งหมด
    detailObject.PATFeedback = feedbackData || [];
    detailObject.PCSWorked = workedData || [];
    detailObject.PresentationItems = presentationItems || [];

    torData.TORDetail = [detailObject];

    console.log(`[API] Final Version: ดึงข้อมูลสำเร็จ. กำลังส่งข้อมูลกลับ...`);
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
