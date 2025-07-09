// routes/feedback.js
const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const checkAdmin = require('../middlewares/checkAdmin');
const { addLog } = require('../services/logService');

// --- POST: Create Feedback ---
router.post('/', checkAdmin, async (req, res) => {
    const { tord_id, feedback_message, status } = req.body;

    if (!tord_id || !feedback_message || !status) {
            return res.status(400).json({ error: 'tord_id, feedback_message, and status are required' });
        }

    const new_id = `F${tord_id.substring(1)}-${Date.now()}`;

    const { data, error } = await supabase
        .from('PATFeedback')
        .insert([{
            feedback_id: new_id,
            tord_id,
            feedback_message,
            status,
            feedback_date: new Date(),
            created_by: req.user.id
        }])
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });

    await addLog(req.user.id, 'CREATE_FEEDBACK', {
        feedback_id: data.feedback_id,
        on_tord_id: tord_id
    });

    res.status(201).json(data);
});

// --- PUT: Update Feedback ---
router.put('/:id', checkAdmin, async (req, res) => {
    const { id } = req.params;
    const { feedback_message, status } = req.body;

    if (!feedback_message || !status) {
            return res.status(400).json({ error: 'feedback_message and status are required' });
        }

    try {
        const { data: oldData } = await supabase
            .from('PATFeedback')
            .select('feedback_message, status')
            .eq('feedback_id', id)
            .single();

        const { data, error } = await supabase
            .from('PATFeedback')
            .update({
                feedback_message,
                status,
                updated_at: new Date()
            })
            .eq('feedback_id', id)
            .select()
            .single();

        if (error) throw error;

        await addLog(req.user.id, 'UPDATE_FEEDBACK', {
            id,
            changes: {
                feedback_message: { from: oldData.feedback_message, to: feedback_message },
                status: { from: oldData.status, to: status }
            }
        });

        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// --- DELETE: Feedback ---
router.delete('/:id', checkAdmin, async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('PATFeedback')
        .delete()
        .eq('feedback_id', id);

    if (error) return res.status(400).json({ error: error.message });

    await addLog(req.user.id, 'DELETE_FEEDBACK', { feedback_id: id });

    res.status(200).json({ message: 'Feedback deleted successfully' });
});

module.exports = router;
