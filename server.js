const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// MongoDB Bağlantısı
mongoose.connect('mongodb+srv://kimaoo1978:12345678aA@cluster0.5e3bo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ MongoDB bağlantısı başarılı');
}).catch(err => {
    console.error('❌ MongoDB bağlantı hatası:', err);
});

// Application Schema
const applicationSchema = new mongoose.Schema({
    userId: String,
    username: String,
    age: Number,
    position: String,
    experience: String,
    reason: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNote: String,
    reviewedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Application = mongoose.model('Application', applicationSchema);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session
app.use(session({
    secret: 'discord-bot-panel-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 saat
    }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Discord OAuth2 Strategy
passport.use(new DiscordStrategy({
    clientID: '1317949056614875176',
    clientSecret: 'YhPMp2YlhxT6zQZI9YYzYBDKW5z8h5Vu',
    callbackURL: 'https://discord-bot-panelv2.onrender.com/auth/discord/callback',
    scope: ['identify', 'email', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Auth Middleware
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.id === '1316826036688797756') {
        return next();
    }
    res.status(403).send('❌ Bu sayfaya erişim yetkiniz yok!');
}

// Routes

// Ana Sayfa
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.send(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Discord Bot Panel - Giriş</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    padding: 60px 40px;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                }
                h1 {
                    color: #5865F2;
                    margin-bottom: 15px;
                    font-size: 32px;
                }
                p {
                    color: #666;
                    margin-bottom: 40px;
                    font-size: 16px;
                }
                .discord-btn {
                    display: inline-block;
                    background: #5865F2;
                    color: white;
                    padding: 15px 40px;
                    border-radius: 10px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 18px;
                    transition: all 0.3s;
                }
                .discord-btn:hover {
                    background: #4752C4;
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px rgba(88, 101, 242, 0.4);
                }
                .features {
                    margin-top: 50px;
                    text-align: left;
                }
                .feature {
                    padding: 15px 0;
                    color: #444;
                }
                .feature::before {
                    content: "✅ ";
                    color: #5865F2;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 Discord Bot Panel</h1>
                <p>Ekibimize katılmak için Discord hesabınızla giriş yapın</p>
                <a href="/auth/discord" class="discord-btn">
                    Discord ile Giriş Yap
                </a>
                <div class="features">
                    <div class="feature">Kolay başvuru sistemi</div>
                    <div class="feature">Başvuru takibi</div>
                    <div class="feature">İstatistikler</div>
                    <div class="feature">Güvenli panel</div>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Auth Routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// Dashboard
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.user });
});

// Başvuru Formu
app.get('/apply', isAuthenticated, async (req, res) => {
    try {
        const existingApplication = await Application.findOne({ userId: req.user.id });
        if (existingApplication) {
            return res.send(`
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Başvuru Mevcut</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            padding: 20px;
                        }
                        .container {
                            background: white;
                            padding: 40px;
                            border-radius: 15px;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                            text-align: center;
                            max-width: 500px;
                        }
                        h1 { color: #5865F2; margin-bottom: 20px; }
                        p { color: #666; margin-bottom: 30px; }
                        a {
                            display: inline-block;
                            padding: 12px 30px;
                            background: #5865F2;
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: 600;
                        }
                        a:hover { background: #4752C4; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>⚠️ Zaten Başvurunuz Var</h1>
                        <p>Daha önce başvuru yaptınız. Başvurunuzu görüntülemek için aşağıdaki butona tıklayın.</p>
                        <a href="/my-application">Başvurumu Görüntüle</a>
                    </div>
                </body>
                </html>
            `);
        }
        res.render('apply', { user: req.user });
    } catch (error) {
        console.error('Başvuru kontrolü hatası:', error);
        res.status(500).send('Bir hata oluştu');
    }
});

app.post('/apply', isAuthenticated, async (req, res) => {
    try {
        const existingApplication = await Application.findOne({ userId: req.user.id });
        if (existingApplication) {
            return res.redirect('/my-application');
        }

        const application = new Application({
            userId: req.user.id,
            username: req.user.username,
            age: req.body.age,
            position: req.body.position,
            experience: req.body.experience,
            reason: req.body.reason
        });

        await application.save();
        console.log('✅ Başvuru kaydedildi:', application._id);
        res.redirect('/my-application');
    } catch (error) {
        console.error('Başvuru kaydetme hatası:', error);
        res.status(500).send('Başvuru kaydedilirken bir hata oluştu');
    }
});

// Başvurum
app.get('/my-application', isAuthenticated, async (req, res) => {
    try {
        const application = await Application.findOne({ userId: req.user.id });
        res.render('my-application', { user: req.user, application });
    } catch (error) {
        console.error('Başvuru görüntüleme hatası:', error);
        res.status(500).send('Bir hata oluştu');
    }
});

// İstatistikler
app.get('/analytics', isAuthenticated, async (req, res) => {
    try {
        const totalApplications = await Application.countDocuments();
        const pendingApplications = await Application.countDocuments({ status: 'pending' });
        const approvedApplications = await Application.countDocuments({ status: 'approved' });
        const rejectedApplications = await Application.countDocuments({ status: 'rejected' });

        const stats = {
            totalApplications,
            pendingApplications,
            approvedApplications,
            rejectedApplications
        };

        res.render('analytics', { user: req.user, stats });
    } catch (error) {
        console.error('İstatistik hatası:', error);
        res.status(500).send('Bir hata oluştu');
    }
});

// Ayarlar
app.get('/settings', isAuthenticated, (req, res) => {
    res.render('settings', { user: req.user });
});

// Admin Panel
app.get('/admin', isAdmin, async (req, res) => {
    try {
        const applications = await Application.find().sort({ createdAt: -1 });
        res.render('admin', { user: req.user, applications });
    } catch (error) {
        console.error('Admin panel hatası:', error);
        res.status(500).send('Bir hata oluştu');
    }
});

app.post('/admin/review/:id', isAdmin, async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        await Application.findByIdAndUpdate(req.params.id, {
            status,
            adminNote,
            reviewedAt: new Date()
        });
        res.redirect('/admin');
    } catch (error) {
        console.error('Başvuru inceleme hatası:', error);
        res.status(500).send('Bir hata oluştu');
    }
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
});
