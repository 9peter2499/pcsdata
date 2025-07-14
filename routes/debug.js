// routes/debug.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

router.get("/test-patfeedback/:id", async (req, res) => {
  const { id } = req.params;
  console.log(
    `[DEBUG] กำลังทดสอบการดึงข้อมูล PATFeedback สำหรับ tord_id: ${id}`
  );

  try {
    const { data, error } = await supabase
      .from("PATFeedback")
      .select(`*`)
      .eq("tord_id", id);

    if (error) {
      console.error("[DEBUG ERROR] เกิดข้อผิดพลาดตอน Query:", error);
      return res.status(500).json({
        message: "เกิดข้อผิดพลาดตอน Query PATFeedback",
        errorDetails: error,
      });
    }

    console.log("[DEBUG SUCCESS] ดึงข้อมูลสำเร็จ:", data);
    res.status(200).json({
      message: "ดึงข้อมูล PATFeedback สำเร็จ",
      count: data.length,
      data: data,
    });
  } catch (e) {
    console.error("[DEBUG CATCH] เกิดข้อผิดพลาดร้ายแรง:", e);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดร้ายแรงที่ไม่สามารถดักจับได้",
      error: e.message,
    });
  }
});

module.exports = router;
