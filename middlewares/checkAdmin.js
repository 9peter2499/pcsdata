// middlewares/checkAdmin.js
const supabase = require('../supabaseClient');

/**
 * Middleware สำหรับตรวจสอบสิทธิ์ admin จาก token
 */
const checkAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        // ตรวจสอบผู้ใช้จาก token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Invalid user token');

        // ดึง role จาก profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) throw new Error('Profile not found for user');
        if (profile?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        // แนบ user object ไว้ที่ req
        req.user = user;
        next();

    } catch (error) {
        return res.status(401).json({ error: error.message });
    }
};

module.exports = checkAdmin;
