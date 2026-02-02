require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');
const Application = require('./models/Application');
const Activity = require('./models/Activity');
const UserStats = require('./models/UserStats');
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB bağlantısı başarılı'))
  .catch(err => console.error('❌ MongoDB bağlantı hatası:', err));

// Environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

// Session middleware
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 hafta
    }
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine
app.set('view engine', 'ejs');
app.set('views', __dirname);

// Static files
app.use(express.static('public'));

// Middleware - Giriş kontrolü
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
}

// Admin middleware
function checkAdmin(req, res, next) {
    if (req.session.user && req.session.user.id === '1316826036688797756') {
        next();
    } else {
        res.status(403).send('Yetkisiz erişim!');
    }
}

// Ana sayfa
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('index', { user: null });
});

// Discord login
app.get('/login', (req, res) => {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20email%20guilds`;
    res.redirect(authUrl);
});

// OAuth2 Callback
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    
    if (!code) {
        return res.redirect('/');
    }

    try {
        // Token exchange
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const accessToken = tokenResponse.data.access_token;

        // Kullanıcı bilgilerini al
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const userData = userResponse.data;

        // Kullanıcı sunucularını al
        const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        // Session'a kaydet
        req.session.user = {
            id: userData.id,
            username: userData.username,
            discriminator: userData.discriminator,
            avatar: userData.avatar,
            email: userData.email,
            guilds: guildsResponse.data,
            accessToken: accessToken
        };

        res.redirect('/dashboard');
    } catch (error) {
        console.error('OAuth Error:', error.response?.data || error.message);
        res.redirect('/?error=auth_failed');
    }
});

// Dashboard
app.get('/dashboard', checkAuth, async (req, res) => {
    try {
        const stats = {
            toplamBasvuru: await Application.countDocuments(),
            bekleyen: await Application.countDocuments({ status: 'pending' }),
            kabul: await Application.countDocuments({ status: 'approved' }),
            red: await Application.countDocuments({ status: 'rejected' })
        };
        res.render('dashboard', { 
            user: req.session.user,
            stats
        });
    } catch (error) {
        console.error('Dashboard hatası:', error);
        res.render('dashboard', { 
            user: req.session.user,
            stats: { toplamBasvuru: 0, bekleyen: 0, kabul: 0, red: 0 }
        });
    }
});

// Başvurular (eski route - değiştirilmedi)
app.get('/applications', checkAuth, (req, res) => {
    res.render('applications', { 
        user: req.session.user,
        applications: []
    });
});

// Ayarlar
app.get('/settings', checkAuth, (req, res) => {
    res.render('settings', { 
        user: req.session.user
    });
});

// ==================== BAŞVURU SİSTEMİ ====================

// Başvuru formu sayfası
app.get('/apply', checkAuth, (req, res) => {
    res.render('apply', { user: req.session.user });
});

// Başvuru gönderme
app.post('/api/apply', checkAuth, async (req, res) => {
    try {
        const { age, reason, experience } = req.body;
        const user = req.session.user;

        const existingApp = await Application.findOne({ userId: user.id });
        if (existingApp) {
            return res.json({ success: false, message: 'Zaten bir başvurunuz var!' });
        }

        const application = new Application({
            userId: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar,
            email: user.email,
            discordTag: `${user.username}#${user.discriminator}`,
            age: parseInt(age),
            reason,
            experience
        });

        await application.save();
        res.json({ success: true, message: 'Başvurunuz başarıyla gönderildi!' });
    } catch (error) {
        console.error('Başvuru hatası:', error);
        res.json({ success: false, message: 'Bir hata oluştu!' });
    }
});

// Kullanıcının başvurusunu görüntüleme
app.get('/my-application', checkAuth, async (req, res) => {
    try {
        const application = await Application.findOne({ userId: req.session.user.id });
        res.render('my-application', { user: req.session.user, application });
    } catch (error) {
        console.error('Başvuru görüntüleme hatası:', error);
        res.redirect('/dashboard');
    }
});

// ==================== ADMIN - BAŞVURU YÖNETİMİ ====================

// Admin başvuru listesi
app.get('/admin/applications', checkAuth, checkAdmin, async (req, res) => {
    try {
        const applications = await Application.find().sort({ createdAt: -1 });
        const stats = {
            toplamBasvuru: await Application.countDocuments(),
            bekleyen: await Application.countDocuments({ status: 'pending' }),
            kabul: await Application.countDocuments({ status: 'approved' }),
            red: await Application.countDocuments({ status: 'rejected' })
        };
        res.render('admin-applications', { 
            user: req.session.user, 
            applications,
            stats 
        });
    } catch (error) {
        console.error('Başvuruları listeleme hatası:', error);
        res.redirect('/dashboard');
    }
});

// Başvuru onay/red
app.post('/api/admin/application/:id', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, note } = req.body;

        const application = await Application.findById(id);
        if (!application) {
            return res.json({ success: false, message: 'Başvuru bulunamadı!' });
        }

        application.status = action === 'approve' ? 'approved' : 'rejected';
        application.reviewedBy = req.session.user.username;
        application.reviewedAt = new Date();
        application.reviewNote = note || '';

        await application.save();
        res.json({ success: true, message: 'Başvuru güncellendi!' });
    } catch (error) {
        console.error('Başvuru güncelleme hatası:', error);
        res.json({ success: false, message: 'Bir hata oluştu!' });
    }
});

// ==================== AKTİVİTE İSTATİSTİKLERİ ====================

// Analytics sayfası
app.get('/analytics', checkAuth, async (req, res) => {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

        // Varsayılan değerler
        let dailyActive = [];
        let topUsers = [];
        let afkUsers = [];
        let hourlyActivity = [];

        try {
            dailyActive = await Activity.distinct('userId', {
                timestamp: { $gte: oneDayAgo }
            });
        } catch (e) {}

        try {
            topUsers = await UserStats.find({ weeklyActive: true })
                .sort({ totalMessages: -1 })
                .limit(10);
        } catch (e) {}

        try {
            afkUsers = await UserStats.find({
                afkSince: { $ne: null },
                lastStatus: 'idle'
            });
        } catch (e) {}

        try {
            hourlyActivity = await Activity.aggregate([
                { $match: { timestamp: { $gte: oneDayAgo } } },
                {
                    $group: {
                        _id: { $hour: '$timestamp' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
        } catch (e) {}

        res.render('analytics', {
            user: req.session.user,
            stats: {
                dailyActiveCount: dailyActive.length || 0,
                topUsers: topUsers || [],
                afkUsers: afkUsers || [],
                hourlyActivity: hourlyActivity || []
            }
        });
    } catch (error) {
        console.error('Analytics hatası:', error);
        res.render('analytics', {
            user: req.session.user,
            stats: {
                dailyActiveCount: 0,
                topUsers: [],
                afkUsers: [],
                hourlyActivity: []
            }
        });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// API - Kullanıcı bilgileri
app.get('/api/user', checkAuth, (req, res) => {
    res.json({
        username: req.session.user.username,
        id: req.session.user.id,
        avatar: req.session.user.avatar
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).send('Sayfa bulunamadı!');
});

// Server başlat
app.listen(PORT, () => {
    console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
});
