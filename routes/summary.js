// routes/summary.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

router.get("/", async (req, res) => {
  try {
    const { data: tors, error } = await supabase
      .from("TORs")
      .select("tor_status, tor_fixing, Modules(module_id, module_name)");

    if (error) throw error;

    const summary = {};

    tors.forEach((tor) => {
      const module = tor.Modules;
      if (!module) return;

      const moduleId = module.module_id;
      const moduleName = module.module_name;
      const status = (tor.tor_status || "unknown").toLowerCase();

      if (!summary[moduleId]) {
        summary[moduleId] = {
          module_id: moduleId,
          module_name: moduleName,
          total: 0,
          fixing_count: 0,
          status_count: {
            completed: 0,
            in_progress: 0,
            pending: 0,
            unknown: 0,
          },
        };
      }

      summary[moduleId].total += 1;

      if (tor.tor_fixing) {
        summary[moduleId].fixing_count += 1;
      }

      if (["completed", "in_progress", "pending"].includes(status)) {
        summary[moduleId].status_count[status] += 1;
      } else {
        summary[moduleId].status_count.unknown += 1;
      }
    });

    const result = Object.values(summary);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
