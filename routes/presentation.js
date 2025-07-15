/ routes/presentation.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../middlewares/checkAdmin");

// ✅ --- ส่วนที่แก้ไข ---
// 1. Import Supabase client ตัวกลางเข้ามา
const supabase = require("../supabaseClient"); 
// 2. Import createClient สำหรับใช้ใน POST endpoint
const { createClient } = require("@supabase/supabase-js"); 
// --- สิ้นสุดส่วนที่แก้ไข ---

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

router.post("/", checkAdmin, async (req, res) => {
  const { ptt_type, ptt_date, ptt_timerange, ptt_remark, selected_tors } =
    req.body;
  const user = req.user;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authorization token not found." });
  }

  const supabaseForUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  try {
    const { data: presentationData, error: presentationError } =
      await supabaseForUser
        .from("Presentation")
        .insert({
          ptt_type,
          ptt_date,
          ptt_timerange,
          ptt_remark,
          ptt_by: user.email,
        })
        .select("ptt_id")
        .single();

    // --- ส่วนที่แก้ไข ---
    if (presentationError) {
      // ส่งข้อความ Error ที่ชัดเจนกลับไป
      throw new Error(presentationError.message);
    }
    if (!presentationData) {
      throw new Error("Failed to create presentation record.");
    }

    const newPresentationId = presentationData.ptt_id;

    const itemsToInsert = selected_tors.map((tor_id) => ({
      ptti_id: newPresentationId,
      tord_id: tor_id,
    }));

    const { error: itemsError } = await supabaseForUser
      .from("PresentationItems")
      .insert(itemsToInsert);

    // --- ส่วนที่แก้ไข ---
    if (itemsError) {
      // ส่งข้อความ Error ที่ชัดเจนกลับไป
      throw new Error(itemsError.message);
    }

    res.status(201).json({
      message: "Presentation recorded successfully.",
      ptt_id: newPresentationId,
    });
  } catch (error) {
    console.error("Error creating presentation:", error.message);
    // ส่ง Error กลับไปพร้อมข้อความที่ชัดเจน
    res.status(500).json({ error: error.message });
  }
});

// --- GET: Distinct Presentation Dates ---
router.get("/dates", async (req, res) => {
  try {
    // ✅ ตอนนี้โค้ดสามารถใช้ตัวแปร supabase ที่ import เข้ามาได้แล้ว
    const { data, error } = await supabase.rpc('get_distinct_presentation_dates');

    if (error) {
      throw error;
    }
    
    const dates = data.map(item => item.ptt_date);
    res.status(200).json(dates);

  } catch (error) {
    console.error("Error fetching distinct presentation dates:", error.message);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
