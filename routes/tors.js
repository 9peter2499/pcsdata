// routes/tors.js
const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const checkAdmin = require("../middlewares/checkAdmin");
const { addLog } = require("../services/logService");

// --- GET: All TORs --- (ส่วนนี้ทำงานถูกต้องแล้ว)
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("TORs").select(`
        *,
        Modules(*),
        tor_status_option:MasterOptions!fk_tor_status(option_label),
        tor_fixing_option:MasterOptions!fk_tor_fixing(option_label)
      `);
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- GET: Single TOR by ID (The Ultimate Fix Version) ---
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`[API] Ultimate Fix: กำลังดึงข้อมูลสำหรับ TOR ID: ${id}`);

  try {
    // Step 1: ดึงข้อมูลหลักของ TORs
    const { data: torData, error: torError } = await supabase
      .from("TORs")
      .select(`*`)
      .eq("tor_id", id)
      .single();
    if (torError) throw new Error(`Error fetching TORs: ${torError.message}`);
    if (!torData) return res.status(404).json({ error: "TOR not found" });
    console.log("[API] Step 1: ดึงข้อมูล TORs สำเร็จ");

    // Step 2: ดึงข้อมูล TORDetail
    const { data: detailData, error: detailError } = await supabase
      .from("TORDetail")
      .select(`*`)
      .eq("tord_id", id);
    if (detailError)
      throw new Error(`Error fetching TORDetail: ${detailError.message}`);
    console.log("[API] Step 2: ดึงข้อมูล TORDetail สำเร็จ");

    if (!detailData || detailData.length === 0) {
      torData.TORDetail = [];
      return res.status(200).json(torData);
    }
    const detailObject = detailData[0];

    // --- ส่วนที่แก้ไข ---
    // Step 3: ดึงข้อมูล Feedback และ Worked โดยระบุ Query อย่างชัดเจน
    const { data: feedbackData, error: feedbackError } = await supabase
      .from("PATFeedback")
      .select(
        `*, feedback_status:MasterOptions!feedback_status_id(option_label)`
      ) // ระบุ Foreign Key อย่างชัดเจน
      .eq("tord_id", id);
    if (feedbackError)
      throw new Error(`Error fetching PATFeedback: ${feedbackError.message}`);
    console.log("[API] Step 3.1: ดึงข้อมูล PATFeedback สำเร็จ");

    const { data: workedData, error: workedError } = await supabase
      .from("PCSWorked")
      .select(`*, worked_status:MasterOptions!worked_status_id(option_label)`) // ระบุ Foreign Key อย่างชัดเจน
      .eq("tord_id", id);
    if (workedError)
      throw new Error(`Error fetching PCSWorked: ${workedError.message}`);
    console.log("[API] Step 3.2: ดึงข้อมูล PCSWorked สำเร็จ");
    // --- สิ้นสุดส่วนที่แก้ไข ---

    // Step 4: ดึงข้อมูล PresentationItems
    const { data: presentationItems, error: pttItemsError } = await supabase
      .from("PresentationItems")
      .select(`*, Presentation(*)`)
      .eq("tord_id", id);
    if (pttItemsError)
      throw new Error(
        `Error fetching PresentationItems: ${pttItemsError.message}`
      );
    console.log("[API] Step 4: ดึงข้อมูล PresentationItems สำเร็จ");

    // Step 5: ประกอบร่างข้อมูลทั้งหมด
    detailObject.PATFeedback = feedbackData || [];
    detailObject.PCSWorked = workedData || [];
    detailObject.PresentationItems = presentationItems || [];
    torData.TORDetail = [detailObject];
    console.log("[API] Step 5: ประกอบร่างข้อมูลสำเร็จ");

    res.status(200).json(torData);
  } catch (error) {
    console.error(
      `[API CATCH] เกิดข้อผิดพลาดสำหรับ TOR ID ${id}:`,
      error.message
    );
    res.status(500).json({ error: error.message });
  }
});

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
