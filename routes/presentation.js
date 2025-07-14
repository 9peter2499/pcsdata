// routes/presentation.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const checkAdmin = require("../middlewares/checkAdmin"); // ถ้าต้องการให้เฉพาะ Admin ทำได้

router.post("/", checkAdmin, async (req, res) => {
  // 1. รับข้อมูลจาก Frontend
  const { ptt_type, ptt_date, ptt_timerange, ptt_remark, selected_tors } =
    req.body;
  const user = req.user; // มาจาก Middleware checkAdmin

  // ตรวจสอบข้อมูลเบื้องต้น
  if (!ptt_type || !selected_tors || selected_tors.length === 0) {
    return res
      .status(400)
      .json({ error: "Missing required presentation data or TOR selection." });
  }

  try {
    // 2. สร้างข้อมูลหลักในตาราง "Presentation" ก่อน
    const { data: presentationData, error: presentationError } = await supabase
      .from("Presentation")
      .insert({
        ptt_type,
        ptt_date,
        ptt_timerange,
        ptt_remark,
        ptt_by: user.email,
      })
      .select("ptt_id") // **สำคัญมาก: สั่งให้ trả về ptt_id ที่เพิ่งสร้าง**
      .single();

    if (presentationError) throw presentationError;
    if (!presentationData)
      throw new Error("Failed to create presentation record.");

    const newPresentationId = presentationData.ptt_id;

    // 3. เตรียมข้อมูลสำหรับตาราง "PresentationItems"
    const itemsToInsert = selected_tors.map((tor_id) => ({
      ptti_id: newPresentationId,
      tord_id: tor_id,
    }));

    // 4. บันทึกข้อมูล Items ทั้งหมดลงใน "PresentationItems"
    const { error: itemsError } = await supabase
      .from("PresentationItems")
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // 5. ส่งการยืนยันกลับไป
    res.status(201).json({
      message: "Presentation recorded successfully.",
      ptt_id: newPresentationId,
    });
  } catch (error) {
    console.error("Error creating presentation:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
