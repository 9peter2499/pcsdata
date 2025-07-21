// routes/summary.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

const CUSTOM_SORT_ORDER = [
  "คุณสมบัติทั่วไปของระบบ",
  "ระบบสำหรับกิจกรรมเรือ (Vessel)",
  "ระบบสำหรับกิจกรรมนำเข้า (Import)",
  "ระบบสำหรับกิจกรรมศุลกากร (Customs)",
  "ระบบสำหรับกิจกรรมส่งออก (Export)",
  "ระบบสำหรับกิจกรรมทางด้านตู้และสินค้า (Container and Cargo)",
  "ระบบสำหรับกิจกรรมการขนส่งด้านหลังท่า (Hinterland)",
  "ระบบสำหรับกิจกรรมธนาคาร (Banking)",
  "ระบบสำหรับบริการข้อมูลทางธุรกิจอัจฉริยะ (PCS Intelligence)",
  "ระบบสำหรับการกำหนดตั้งค่าระบบ และเครื่องมือที่ช่วยในการทำงาน (Setup & Utility)",
  "ระบบสำหรับผู้ดูแลระบบในการจัดการผู้ใช้ และสิทธิ์การใช้งาน (Administration)",
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

    // ✅ เพิ่มบรรทัดนี้เข้ามาในตำแหน่งที่ถูกต้อง
    const modulesArray = Object.values(summary);

    // --- DEBUGGING LOGS ---
    console.log("--- DEBUGGING SORT ---");
    console.log(
      "Array BEFORE sort:",
      modulesArray.map((m) => m.module_id)
    );

    // ใช้ Custom Order ที่กำหนดไว้ในการเรียงลำดับ
    modulesArray.sort((a, b) => {
      const indexA = CUSTOM_SORT_ORDER.indexOf(a.module_id);
      const indexB = CUSTOM_SORT_ORDER.indexOf(b.module_id);
      // Log เพื่อดูว่าหา index เจอหรือไม่
      console.log(
        `Comparing: ${a.module_id} (index ${indexA}) vs ${b.module_id} (index ${indexB})`
      );
      return indexA - indexB;
    });

    console.log(
      "Array AFTER sort:",
      modulesArray.map((m) => m.module_id)
    );
    console.log("--- END DEBUGGING ---");
    // --- END DEBUGGING LOGS ---

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
