// routes/log.js
const express = require('express');
const router = express.Router();
const { addLog } = require('../services/logService');

/**
 * POST /api/log-action
 * ใช้บันทึก Log จากฝั่ง Client เช่นการคลิกปุ่ม, การเปลี่ยนหน้าจอ
 */
router.post('/', async (req, res) => {
    const { userId, action, details } = req.body;

    if (!userId || !action) {
            return res.status(400).json({ error: 'userId and action are required.' });
        }

    if (!userId || !action) {
        return res.status(400).json({ error: 'userId and action are required.' });
    }

    await addLog(userId, action, details);
    res.status(200).json({ message: 'Log recorded' });
});

module.exports = router;
