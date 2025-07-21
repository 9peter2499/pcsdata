// routes/summary.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

// ✅ 1. กำหนดลำดับที่ต้องการเอง (Custom Order)
const CUSTOM_SORT_ORDER = [
  "คุณสมบัติทั่วไปของระบบ",
  "ระบบกิจกรรมเรือ (Vessel)",
  "ระบบกิจกรรมนำเข้า (Import)",
  "ระบบกิจกรรมศุลกากร (Customs)",
  "ระบบกิจกรรมส่งออก (Export)",
  "ระบบกิจกรรมทางด้านตู้และสินค้า (Container and Cargo)",
  "ระบบกิจกรรมการขนส่งด้านหลังท่า (Hinterland)",
  "ระบบกิจกรรมธนาคาร (Banking)",
  "ระบบบริการข้อมูลทางธุรกิจอัจฉริยะ (PCS Intelligence)",
  "ระบบตั้งค่าระบบ และเครื่องมือที่ช่วยในการทำงาน (Setup & Utility)",
  "ระบบผู้ดูแลระบบในการจัดการผู้ใช้ และสิทธิ์การใช้งาน (Administration)",
  "ระบบรายงาน (Reports)",
];

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
          module_id: moduleId,
          module_name: moduleName,
          stats: {
            pass: 0,
            done: 0,
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
          summary[moduleId].stats.done += 1;
        } else if (fixingId === "PENDING") {
          summary[moduleId].stats.fixed_pending_review += 1;
        } else if (fixingId === "GUIDANCE") {
          summary[moduleId].stats.needs_guidance += 1;
        }
      }
    });

    const modulesArray = Object.values(summary);

    // ✅ 2. ใช้ Custom Order ที่กำหนดไว้ในการเรียงลำดับ
    modulesArray.sort(
      (a, b) =>
        CUSTOM_SORT_ORDER.indexOf(a.module_id) -
        CUSTOM_SORT_ORDER.indexOf(b.module_id)
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
