// routes/feedback.js
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

// --- POST: Create Feedback ---
router.post("/", checkAdmin, async (req, res) => {
  const { tord_id, feedback_message, feedback_status_id } = req.body;

  if (
    typeof tord_id !== "string" ||
    typeof feedback_message !== "string" ||
    typeof feedback_status_id !== "string"
  ) {
    return res.status(400).json({
      error:
        "tord_id, feedback_message, and feedback_status_id are required as strings",
    });
  }

  const new_id = generateCustomId("F", tord_id);

  const { data, error } = await supabase
    .from("PATFeedback")
    .insert([
      {
        feedback_id: new_id,
        tord_id,
        feedback_message,
        feedback_status_id,
        feedback_date: new Date(),
        created_by: req.user.id,
      },
    ])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  await addLog(req.user.id, "CREATE_FEEDBACK", {
    feedback_id: data.feedback_id,
    on_tord_id: tord_id,
  });

  res.status(201).json(data);
});

// --- PUT: Update Feedback ---
router.put("/:id", checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { feedback_message, feedback_status_id } = req.body;

  if (
    typeof feedback_message !== "string" ||
    typeof feedback_status_id !== "string"
  ) {
    return res.status(400).json({
      error: "feedback_message and feedback_status_id are required as strings",
    });
  }

  try {
    const { data: oldData } = await supabase
      .from("PATFeedback")
      .select("feedback_message, feedback_status_id")
      .eq("feedback_id", id)
      .single();

    const { data, error } = await supabase
      .from("PATFeedback")
      .update({
        feedback_message,
        feedback_status_id,
        updated_by: req.user.id,
        updated_at: new Date(),
      })
      .eq("feedback_id", id)
      .select()
      .single();

    if (error) throw error;

    await addLog(req.user.id, "UPDATE_FEEDBACK", {
      feedback_id: id,
      changes: {
        feedback_message: {
          from: oldData.feedback_message,
          to: feedback_message,
        },
        feedback_status_id: {
          from: oldData.feedback_status_id,
          to: feedback_status_id,
        },
      },
    });

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- DELETE: Feedback ---
router.delete("/:id", checkAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("PATFeedback")
    .delete()
    .eq("feedback_id", id);

  if (error) return res.status(400).json({ error: error.message });

  await addLog(req.user.id, "DELETE_FEEDBACK", { feedback_id: id });

  res.status(200).json({ message: "Feedback deleted successfully" });
});

module.exports = router;
