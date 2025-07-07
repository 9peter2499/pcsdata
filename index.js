// 1. --- Import Packages ---
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// 2. --- App & Supabase Setup ---
const app = express();
const port = 3000;

const supabaseUrl = 'https://fhnprrlmlhleomfqqvpp.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZobnBycmxtbGhsZW9tZnFxdnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MTAyMjIsImV4cCI6MjA2NjQ4NjIyMn0.WA-_yNFWxpFnJBA3oh5UlOtq89KBm5hqsb51oi04hMk';
const supabase = createClient(supabaseUrl, supabaseKey);

// 3. --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Helper Functions ---
const addLog = async (userId, action, details = {}) => {
    try {
        const { error } = await supabase.from('AppLogs').insert([{ user_id: userId, action, details }]);
        if (error) console.error('Error logging action:', error.message);
    } catch (e) { console.error('Failed to execute addLog:', e.message); }
};

const checkAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid user token');

        const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profileError) throw new Error('Profile not found for user');
        if (profile?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: error.message });
    }
};

// 4. --- API Endpoints ---

// Log client-side actions
app.post('/api/log-action', async (req, res) => {
    const { userId, action, details } = req.body;
    if (!userId || !action) return res.status(400).json({ error: 'userId and action are required.' });
    await addLog(userId, action, details);
    res.status(200).json({ message: 'Log recorded' });
});

// GET All TORs (ไม่มีการบันทึก Log เพราะเป็นการอ่านข้อมูล)
app.get('/api/tors', async (req, res) => { try {
        const { data, error } = await supabase.from('TORs').select('*, Modules(*)');
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); } });

// GET a Single TOR (ไม่มีการบันทึก Log เพราะเป็นการอ่านข้อมูล)
app.get('/api/tors/:id', async (req, res) => { const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('TORs')
            .select(`*, Modules(*), TORDetail(*, PATFeedback(*), PCSWorked(*))`)
            .eq('tor_id', id).single();
        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'TOR not found' });
            throw error;
        }
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
 });

// --- CRUD for TORs ---
app.put('/api/tors/:id', checkAdmin, async (req, res) => {
    const { id } = req.params;
    const { tor_status, tor_fixing } = req.body;
    try {
        const { data: oldData } = await supabase.from('TORs').select('tor_status, tor_fixing').eq('tor_id', id).single();
        const { data, error } = await supabase.from('TORs').update({ tor_status, tor_fixing, updated_at: new Date() }).eq('tor_id', id).select().single();
        if (error) throw error;
        await addLog(req.user.id, 'UPDATE_TOR', {
            tor_id: id,
            changes: {
                status: { from: oldData.tor_status, to: tor_status },
                fixing: { from: oldData.tor_fixing, to: tor_fixing }
            }
        });
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
});

// --- CRUD for TORDetail ---
app.put('/api/tordetail/:tord_id', checkAdmin, async (req, res) => {
    const { tord_id } = req.params;
    const updateData = req.body;

    try {
        // 1. ดึงข้อมูลเก่าออกมาก่อน
        const { data: oldData, error: fetchError } = await supabase
            .from('TORDetail')
            .select('*')
            .eq('tord_id', tord_id)
            .single();
        if (fetchError) throw new Error('Could not fetch old TORDetail to create log');

        // 2. อัปเดตข้อมูลใหม่
        const { data, error } = await supabase
            .from('TORDetail')
            .update({ ...updateData, updated_at: new Date() })
            .eq('tord_id', tord_id)
            .select()
            .single();
        if (error) throw error;
        
        // 3. สร้างรายละเอียดการเปลี่ยนแปลงสำหรับ Log
        const changes = {};
        for (const key in updateData) {
            if (updateData[key] !== oldData[key]) {
                changes[key] = { from: oldData[key], to: updateData[key] };
            }
        }
        
        // 4. บันทึก Log ถ้ามีการเปลี่ยนแปลง
        if (Object.keys(changes).length > 0) {
            await addLog(req.user.id, 'UPDATE_TORDETAIL', { tord_id, changes });
        }

        res.status(200).json(data);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// --- CRUD for PATFeedback ---
app.post('/api/feedback', checkAdmin, async (req, res) => {
    const { tord_id, feedback_message, status } = req.body;
    const new_id = `F${tord_id.substring(1)}-${Date.now()}`;
    const { data, error } = await supabase
      .from('PATFeedback')
      .insert([{ feedback_id: new_id, tord_id, feedback_message, status, feedback_date: new Date(), created_by: req.user.id }])
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    
    await addLog(req.user.id, 'CREATE_FEEDBACK', { feedback_id: data.feedback_id, on_tord_id: tord_id });
    res.status(201).json(data);
});

app.put('/api/feedback/:id', checkAdmin, async (req, res) => {
    const { id } = req.params;
    const { feedback_message, status } = req.body;
    try {
        const { data: oldData } = await supabase.from('PATFeedback').select('feedback_message, status').eq('feedback_id', id).single();
        const { data, error } = await supabase.from('PATFeedback').update({ feedback_message, status, updated_at: new Date() }).eq('feedback_id', id).select().single();
        if (error) throw error;
        await addLog(req.user.id, 'UPDATE_FEEDBACK', {
            id,
            changes: {
                feedback_message: { from: oldData.feedback_message, to: feedback_message },
                status: { from: oldData.status, to: status }
            }
        });
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
});

app.delete('/api/feedback/:id', checkAdmin, async (req, res) => {
    const { error } = await supabase.from('PATFeedback').delete().eq('feedback_id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });

    await addLog(req.user.id, 'DELETE_FEEDBACK', { feedback_id: req.params.id });
    res.status(200).json({ message: 'Feedback deleted successfully' });
});

// --- CRUD for PCSWorked ---
app.post('/api/worked', checkAdmin, async (req, res) => {
    const { tord_id, worked_message, status } = req.body;
    const new_id = `W${tord_id.substring(1)}-${Date.now()}`;
    const { data, error } = await supabase
      .from('PCSWorked')
      .insert([{ worked_id: new_id, tord_id, worked_message, status, worked_date: new Date(), created_by: req.user.id }])
      .select().single();
    if (error) return res.status(400).json({ error: error.message });

    await addLog(req.user.id, 'CREATE_WORKED', { worked_id: data.worked_id, on_tord_id: tord_id });
    res.status(201).json(data);
});

app.put('/api/worked/:id', checkAdmin, async (req, res) => {
    const { id } = req.params;
    const { worked_message, status } = req.body;
    try {
        const { data: oldData } = await supabase.from('PCSWorked').select('worked_message, status').eq('worked_id', id).single();
        const { data, error } = await supabase.from('PCSWorked').update({ worked_message, status, updated_at: new Date() }).eq('worked_id', id).select().single();
        if (error) throw error;
        await addLog(req.user.id, 'UPDATE_WORKED', {
            id,
            changes: {
                worked_message: { from: oldData.worked_message, to: worked_message },
                status: { from: oldData.status, to: status }
            }
        });
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
});

app.delete('/api/worked/:id', checkAdmin, async (req, res) => {
    const { error } = await supabase.from('PCSWorked').delete().eq('worked_id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });

    await addLog(req.user.id, 'DELETE_WORKED', { worked_id: req.params.id });
    res.status(200).json({ message: 'Work detail deleted successfully' });
});

// --- Summary Endpoint ---
app.get('/api/summary', async (req, res) => {
    try {
        const { data: tors, error } = await supabase
            .from('TORs')
            .select('tor_status, tor_fixing, Modules(module_id, module_name)');
        if (error) throw error;
        
        // ... โค้ด Logic การนับและสรุปผล ...
        const summary = {};
        tors.forEach(tor => {
            if (!tor.Modules) return;
            const moduleId = tor.Modules.module_id;
            if (!summary[moduleId]) {
                summary[moduleId] = { /* ... */ };
            }
            // ...
        });

        const result = Object.values(summary);
        // การเรียงลำดับควรทำที่ Frontend เพื่อความยืดหยุ่น
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// 5. --- Start The Server ---
app.listen(port, () => {
    console.log(`✅ API Server is running at http://localhost:${port}`);
});