// routes/presentation.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../middlewares/checkAdmin");

// สำคัญ: เราจะ import createClient มาใช้สร้าง instance ใหม่
const { createClient } = require("@supabase/supabase-js");

// เราจะใช้ Environment Variables ที่ตั้งค่าไว้ใน Render.com
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

router.post("/", checkAdmin, async (req, res) => {
  const {
    ptt_type,
    ptt_date,
    ptt_timerange,
    ptt_remark,
    ptt_presenter_id,
    selected_tors,
  } = req.body;
  const user = req.user;

  // 1. ดึง Token ของผู้ใช้ออกจาก Header
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token not found." });
  }

  // 2. สร้าง Supabase client "เฉพาะกิจ" สำหรับ Request นี้
  //    โดยใส่ Token ของผู้ใช้เข้าไป เพื่อให้ Supabase รู้ว่าใครเป็นคนสั่ง
  const supabaseForUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  try {
    // 3. ใช้ client เฉพาะกิจ (supabaseForUser) ในการ Query ทั้งหมด
    const { data: presentationData, error: presentationError } =
      await supabaseForUser
        .from("Presentation")
        .insert({
          ptt_type,
          ptt_date,
          ptt_timerange,
          ptt_remark,
          ptt_presenter_id,
          ptt_by: user.email,
        })
        .select("ptt_id")
        .single();

    if (presentationError) {
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

    // ใช้ client เดียวกันในการเพิ่มข้อมูล Items
    const { error: itemsError } = await supabaseForUser
      .from("PresentationItems")
      .insert(itemsToInsert);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    res.status(201).json({
      message: "Presentation recorded successfully.",
      ptt_id: newPresentationId,
    });
  } catch (error) {
    console.error("Error creating presentation:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- GET: Distinct Presentation Dates (เวอร์ชัน Debug) ---
router.get("/dates", async (req, res) => {
  try {
    console.log("[DEBUG] Inside /dates endpoint - Starting query...");

    // ใช้ Query ที่ง่ายที่สุดเพื่อดึงข้อมูลวันที่ทั้งหมด
    const { data, error } = await supabase
      .from("Presentation")
      .select("ptt_date");

    if (error) {
      console.error("[DEBUG] Error from Supabase query:", error);
      throw error;
    }

    console.log(`[DEBUG] Successfully fetched ${data.length} date records.`);

    if (!data) {
      return res.status(200).json([]);
    }

    // กรองและจัดเรียงข้อมูลด้วย JavaScript เพื่อความแน่นอน
    const distinctDates = [
      ...new Set(data.map((item) => item.ptt_date).filter(Boolean)),
    ];
    distinctDates.sort((a, b) => new Date(b) - new Date(a));

    console.log("[DEBUG] Processed distinct dates:", distinctDates);
    res.status(200).json(distinctDates);
  } catch (error) {
    console.error("[DEBUG] CATCH block error in /dates:", error.message);
    res.status(500).json({ error: "Failed to get dates: " + error.message });
  }
});

module.exports = router;
