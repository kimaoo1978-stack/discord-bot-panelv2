require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');
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
app.get('/dashboard', checkAuth, (req, res) => {
    res.render('dashboard', { 
        user: req.session.user,
        stats: {
            toplamBasvuru: 0,
            bekleyen: 0,
            kabul: 0,
            red: 0
        }
    });
});

// Başvurular
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
