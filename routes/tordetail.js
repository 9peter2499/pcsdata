// routes/tordetail.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const checkAdmin = require("../middlewares/checkAdmin");
const { addLog } = require("../services/logService");

/**
 * PUT /api/tordetail/:tord_id
 * อัปเดต TORDetail และบันทึก Log เฉพาะ field ที่เปลี่ยน
 */
router.put("/:tord_id", checkAdmin, async (req, res) => {
  const { tord_id } = req.params;
  const updateData = req.body;

  if (!updateData || typeof updateData !== "object") {
    return res.status(400).json({ error: "Invalid input data" });
  }

  if (
    updateData.tord_posible_id &&
    typeof updateData.tord_posible_id !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "tord_posible_id must be a string if provided" });
  }

  try {
    // 1. ดึงข้อมูลเก่า
    const { data: oldData, error: fetchError } = await supabase
      .from("TORDetail")
      .select("*")
      .eq("tord_id", tord_id)
      .single();

    if (fetchError)
      throw new Error("Could not fetch old TORDetail to create log");

    // 2. อัปเดตข้อมูลใหม่
    const { data, error } = await supabase
      .from("TORDetail")
      .update({
        ...updateData,
        updated_by: req.user.id, // ✅ เพิ่มตรงนี้
        updated_at: new Date(),
      })
      .eq("tord_id", tord_id)
      .select()
      .single();

    if (error) throw error;

    // 3. เปรียบเทียบความเปลี่ยนแปลง
    const changes = {};
    for (const key in updateData) {
      if (updateData[key] !== oldData[key]) {
        changes[key] = { from: oldData[key], to: updateData[key] };
      }
    }

    // 4. บันทึก Log
    if (Object.keys(changes).length > 0) {
      await addLog(req.user.id, "UPDATE_TORDETAIL", { tord_id, changes });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
