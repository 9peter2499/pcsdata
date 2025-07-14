// supabaseClient.js

// 1. สั่งให้โหลด Environment Variables ที่บรรทัดบนสุดของไฟล์นี้เลย
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

// 2. แก้ไขชื่อ Key ให้เป็นมาตรฐานและตรงกับที่เราตั้งค่าไว้ใน Render
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // <-- แก้ไขจาก SUPABASE_KEY
);

module.exports = supabase;
