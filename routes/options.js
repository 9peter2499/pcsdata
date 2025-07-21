// routes/options.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

// --- 🚀 Endpoint ใหม่: ดึง MasterOptions ทั้งหมดในครั้งเดียว ---
router.get("/all", async (req, res) => {
  console.log("🚚 GET /api/options/all - Fetching all master options...");
  try {
    const groups = ["status", "fixing", "posible", "document", "presenter"];

    // สร้าง Promise สำหรับดึงข้อมูลแต่ละกลุ่มจาก Database
    const promises = groups.map((group) =>
      supabase
        .from("MasterOptions")
        .select("option_id, option_label, display_order")
        .eq("option_group", group) // ใช้ eq เพื่อความแม่นยำ
        .eq("is_active", true)
        .order("display_order", { ascending: true })
    );

    // รอให้ทุก Promise ทำงานเสร็จ (ยิงไปหา DB พร้อมกัน)
    const results = await Promise.all(promises);

    // ตรวจสอบว่ามี error จาก Supabase หรือไม่
    const firstErrorResult = results.find((result) => result.error);
    if (firstErrorResult) {
      throw firstErrorResult.error;
    }

    // จัดรูปแบบข้อมูลให้อยู่ในรูป object ที่ frontend ต้องการ
    const allOptions = {};
    groups.forEach((group, index) => {
      allOptions[group] = results[index].data;
    });

    res.status(200).json(allOptions);
  } catch (error) {
    console.error("Error fetching all master options:", error.message);
    res.status(500).json({ error: error.message });
  }
});

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
