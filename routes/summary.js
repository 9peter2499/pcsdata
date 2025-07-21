// routes/summary.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

router.get("/", async (req, res) => {
  try {
    // 1. แก้ไข 'option_name' เป็น 'option_label' ตาม Schema ที่ถูกต้อง
    const { data: tors, error } = await supabase.from("TORs").select(`
        Modules(module_id, module_name),
        status:tor_status_id(option_label),
        fixing:tor_fixing_id(option_label)
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
          stats: {
            pass: 0,
            fixed_pending_review: 0,
            needs_guidance: 0,
          },
        };
      }

      // 2. แก้ไขการเข้าถึง property จาก .option_name เป็น .option_label
      const statusText = tor.status ? tor.status.option_label : null;

      // ตรวจสอบและนับตามสถานะที่ได้รับ
      if (statusText === "ผ่าน") {
        summary[moduleId].stats.pass += 1;
      } else if (statusText === "แก้ไขแล้ว รอพิจารณา") {
        summary[moduleId].stats.fixed_pending_review += 1;
      } else if (statusText === "ต้องการคำแนะนำ") {
        summary[moduleId].stats.needs_guidance += 1;
      }
    });

    const modulesArray = Object.values(summary);
    res.status(200).json({
      lastUpdated: new Date().toISOString(),
      modules: modulesArray,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
