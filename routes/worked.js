// routes/worked.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const checkAdmin = require("../middlewares/checkAdmin");
const { addLog } = require("../services/logService");

// --- Helper: สร้าง ID ใหม่แบบ custom ---
function generateCustomId(prefixChar, tord_id) {
  const baseId = prefixChar + tord_id.substring(1);
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  const timestamp = `${now.getFullYear().toString().slice(-2)}${pad(
    now.getMonth() + 1
  )}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds()
  )}`;
  return `${baseId}-${timestamp}`;
}

// --- POST: Create Worked Detail ---
router.post("/", checkAdmin, async (req, res) => {
  const { tord_id, worked_message, worked_status_id } = req.body;

  if (
    typeof tord_id !== "string" ||
    typeof worked_message !== "string" ||
    typeof worked_status_id !== "string"
  ) {
    return res
      .status(400)
      .json({
        error:
          "tord_id, worked_message, and worked_status_id are required as strings",
      });
  }

  const new_id = generateCustomId("W", tord_id);

  const { data, error } = await supabase
    .from("PCSWorked")
    .insert([
      {
        worked_id: new_id,
        tord_id,
        worked_message,
        worked_status_id,
        worked_date: new Date(),
        created_by: req.user.id,
      },
    ])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  await addLog(req.user.id, "CREATE_WORKED", {
    worked_id: data.worked_id,
    on_tord_id: tord_id,
  });

  res.status(201).json(data);
});

// --- PUT: Update Worked Detail ---
router.put("/:id", checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { worked_message, worked_status_id } = req.body;

  if (
    typeof worked_message !== "string" ||
    typeof worked_status_id !== "string"
  ) {
    return res
      .status(400)
      .json({
        error: "worked_message and worked_status_id are required as strings",
      });
  }

  try {
    const { data: oldData } = await supabase
      .from("PCSWorked")
      .select("worked_message, worked_status_id")
      .eq("worked_id", id)
      .single();

    const { data, error } = await supabase
      .from("PCSWorked")
      .update({
        worked_message,
        worked_status_id,
        updated_by: req.user.id,
        updated_at: new Date(),
      })
      .eq("worked_id", id)
      .select()
      .single();

    if (error) throw error;

    await addLog(req.user.id, "UPDATE_WORKED", {
      worked_id: id,
      changes: {
        worked_message: {
          from: oldData.worked_message,
          to: worked_message,
        },
        worked_status_id: {
          from: oldData.worked_status_id,
          to: worked_status_id,
        },
      },
    });

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- DELETE: Worked Detail ---
router.delete("/:id", checkAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("PCSWorked")
    .delete()
    .eq("worked_id", id);

  if (error) return res.status(400).json({ error: error.message });

  await addLog(req.user.id, "DELETE_WORKED", { worked_id: id });

  res.status(200).json({ message: "Work detail deleted successfully" });
});

module.exports = router;
