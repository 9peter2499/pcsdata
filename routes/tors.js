// routes/tors.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const checkAdmin = require("../middlewares/checkAdmin");
const { addLog } = require("../services/logService");

// --- GET: All TORs ---
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("TORs")
      .select(
        `
        tor_id,
        tor_name,
        created_at,
        Modules(module_name),
        tor_status:MasterOptions!fk_tor_status(option_label),
        tor_fixing:MasterOptions!fk_tor_fixing(option_label)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching all TORs:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- GET: Single TOR by ID (The Definitive Fix Version) ---
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Step 1: ดึงข้อมูลหลักของ TORs
    const { data: torData, error: torError } = await supabase
      .from("TORs")
      .select(
        `
        tor_id,
        tor_name,
        created_at,
        Modules(module_name),
        tor_status:MasterOptions!fk_tor_status(option_label),
        tor_fixing:MasterOptions!fk_tor_fixing(option_label)
      `
      )
      .eq("tor_id", id)
      .single();
    if (torError) throw new Error(`Error fetching TORs: ${torError.message}`);
    if (!torData) return res.status(404).json({ error: "TOR not found" });

    // Step 2: ดึงข้อมูล TORDetail โดยใช้ tor_id
    const { data: detailData, error: detailError } = await supabase
      .from("TORDetail")
      .select(
        `
    *,
    tord_posible:MasterOptions!fk_tord_posible(option_label)
  `
      )
      .eq("tor_id", id); // ✅ ใช้ foreign key เชื่อม TORs

    if (detailError)
      throw new Error(`Error fetching TORDetail: ${detailError.message}`);

    if (!detailData || detailData.length === 0) {
      torData.TORDetail = [];
      return res.status(200).json(torData);
    }

    // ใช้ทั้งหมด ไม่ใช่เฉพาะ index 0
    torData.TORDetail = detailData;

    // Step 3: ดึงข้อมูลที่เกี่ยวข้องทั้งหมดพร้อมกัน
    const [
      { data: feedbackData, error: feedbackError },
      { data: workedData, error: workedError },
      { data: presentationItems, error: pttItemsError },
    ] = await Promise.all([
      supabase
        .from("PATFeedback")
        .select(
          `*, feedback_status:MasterOptions!fk_patfeedback_status(option_label)`
        )
        .eq("tord_id", id),
      supabase.from("PCSWorked").select(`*`).eq("tord_id", id), // สมมติว่า PCSWorked ไม่มี FK ไป MasterOptions
      supabase
        .from("PresentationItems")
        .select(`*, Presentation(*)`)
        .eq("tord_id", id),
    ]);

    if (feedbackError)
      throw new Error(`Error fetching PATFeedback: ${feedbackError.message}`);
    if (workedError)
      throw new Error(`Error fetching PCSWorked: ${workedError.message}`);
    if (pttItemsError)
      throw new Error(
        `Error fetching PresentationItems: ${pttItemsError.message}`
      );

    // Step 4: ผูกข้อมูลเพิ่มเติมให้ทุกรายการ TORDetail
const enrichedDetails = detailData.map((detail) => {
  const tordId = detail.tord_id;

  return {
    ...detail,
    PATFeedback: feedbackData.filter((f) => f.tord_id === tordId),
    PCSWorked: workedData.filter((w) => w.tord_id === tordId),
    PresentationItems: presentationItems.filter((p) => p.tord_id === tordId),
  };
});

torData.TORDetail = enrichedDetails;

res.status(200).json(torData);

// --- PUT: Update TOR ---
// (ส่วนนี้ทำงานถูกต้องแล้ว ไม่ต้องแก้ไข)
router.put("/:id", checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { tor_status_id, tor_fixing_id } = req.body;

  if (!tor_status_id || typeof tor_status_id !== "string") {
    return res
      .status(400)
      .json({ error: "tor_status_id is required and must be a string" });
  }
  if (!tor_fixing_id || typeof tor_fixing_id !== "string") {
    return res
      .status(400)
      .json({ error: "tor_fixing_id is required and must be a string" });
  }

  try {
    const { data: oldData } = await supabase
      .from("TORs")
      .select("tor_status_id, tor_fixing_id")
      .eq("tor_id", id)
      .single();

    const { data, error } = await supabase
      .from("TORs")
      .update({
        tor_status_id,
        tor_fixing_id,
        updated_by: req.user.id,
        updated_at: new Date(),
      })
      .eq("tor_id", id)
      .select()
      .single();

    if (error) throw error;

    await addLog(req.user.id, "UPDATE_TOR", {
      tor_id: id,
      changes: {
        status: { from: oldData.tor_status_id, to: tor_status_id },
        fixing: { from: oldData.tor_fixing_id, to: tor_fixing_id },
      },
    });

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
