// routes/summary.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

router.get("/", async (req, res) => {
  try {
    // 1. อัปเดตคำสั่ง SELECT ให้ดึงข้อมูลจากตารางที่เกี่ยวข้อง (JOIN)
    const { data: tors, error } = await supabase.from("TORs").select(`
        Modules(module_id, module_name),
        status:tor_status_id(option_name),
        fixing:tor_fixing_id(option_name)
      `);

    if (error) throw error;

    const summary = {};

    tors.forEach((tor) => {
      const module = tor.Modules;
      if (!module) return;

      const moduleId = module.module_id;
      const moduleName = module.module_name;

      if (!summary[moduleId]) {
        summary[moduleId] = {
          module_id: moduleId,
          module_name: moduleName,
          // 2. สร้างโครงสร้าง "stats" ให้ตรงกับที่ Frontend ต้องการใช้
          stats: {
            pass: 0,
            fixed_pending_review: 0,
            needs_guidance: 0,
          },
        };
      }

      // 3. แปลงค่าที่ได้จาก DB ให้เป็นหมวดหมู่ที่ Frontend เข้าใจ
      const statusText = tor.status ? tor.status.option_name : null;

      if (statusText === "ผ่าน") {
        summary[moduleId].stats.pass += 1;
      } else if (statusText === "แก้ไขแล้ว รอพิจารณา") {
        summary[moduleId].stats.fixed_pending_review += 1;
      } else if (statusText === "ต้องการคำแนะนำ") {
        summary[moduleId].stats.needs_guidance += 1;
      }
    });

    // 4. แปลง object ให้เป็น array และจัดโครงสร้างสุดท้ายก่อนส่งออก
    const modulesArray = Object.values(summary);
    res.status(200).json({
      lastUpdated: new Date().toISOString(),
      modules: modulesArray, // ส่งออกเป็น object ที่มี key ชื่อ "modules"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
