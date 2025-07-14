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
  const { ptt_type, ptt_date, ptt_timerange, ptt_remark, selected_tors } =
    req.body;
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
          ptt_by: user.email,
        })
        .select("ptt_id")
        .single();

    if (presentationError) throw presentationError;
    if (!presentationData)
      throw new Error("Failed to create presentation record.");

    const newPresentationId = presentationData.ptt_id;

    const itemsToInsert = selected_tors.map((tor_id) => ({
      ptti_id: newPresentationId,
      tord_id: tor_id,
    }));

    // ใช้ client เดียวกันในการเพิ่มข้อมูล Items
    const { error: itemsError } = await supabaseForUser
      .from("PresentationItems")
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    res
      .status(201)
      .json({
        message: "Presentation recorded successfully.",
        ptt_id: newPresentationId,
      });
  } catch (error) {
    console.error("Error creating presentation:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
