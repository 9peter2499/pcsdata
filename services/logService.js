// services/logService.js
const supabase = require('../supabaseClient');

/**
 * บันทึก Log สำหรับการกระทำของผู้ใช้
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} action - กิจกรรมที่ทำ เช่น CREATE_TOR, DELETE_FEEDBACK
 * @param {object} details - ข้อมูลเพิ่มเติมที่บันทึกใน log
 */
const addLog = async (userId, action, details = {}) => {
    try {
        const { error } = await supabase.from('AppLogs').insert([
            { user_id: userId, action, details }
        ]);
        if (error) console.error('Error logging action:', error.message);
    } catch (e) {
        console.error('Failed to execute addLog:', e.message);
    }
};

module.exports = { addLog };
