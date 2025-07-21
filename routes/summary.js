// routes/summary.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

router.get("/", async (req, res) => {
  try {
    const { data: tors, error } = await supabase.from("TORs").select(`
        module_id,
        tor_status_id,
        tor_fixing_id,
        Modules(module_id, module_name)
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
          module_id: moduleName,
          module_name: moduleName,
          stats: {
            pass: 0,
            done: 0, // เพิ่ม Field สำหรับนับ DONE
            fixed_pending_review: 0,
            needs_guidance: 0,
          },
        };
      }

      const statusId = tor.tor_status_id;
      const fixingId = tor.tor_fixing_id;

      if (statusId === "PASS") {
        summary[moduleId].stats.pass += 1;
      } else if (statusId === "FAIL") {
        if (fixingId === "DONE") {
          summary[moduleId].stats.done += 1; // 3.1 แก้ไขแล้ว
        } else if (fixingId === "PENDING") {
          summary[moduleId].stats.fixed_pending_review += 1; // 3.2 แก้ไขแล้วรอพิจารณา
        } else if (fixingId === "GUIDANCE") {
          summary[moduleId].stats.needs_guidance += 1; // 3.3 ต้องการคำแนะนำ
        }
      }
    });

    //const modulesArray = Object.values(summary);

    const modulesArray = Object.values(summary).sort((a, b) =>
      a.module_id.localeCompare(b.module_id)
    );

    res.status(200).json({
      lastUpdated: new Date().toISOString(),
      modules: modulesArray,
    });
  } catch (error) {
    console.error("Error in /api/summary:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
