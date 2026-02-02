const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Config
const config = {
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: 'https://discord-bot-panelv2.onrender.com/callback',
  scope: ['identify', 'guilds']
};

// Session
app.use(session({
  secret: 'discord-bot-secret-key-12345',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60000 * 60 * 24 } // 24 saat
}));

// Passport setup
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: config.clientID,
  clientSecret: config.clientSecret,
  callbackURL: config.callbackURL,
  scope: config.scope
}, (accessToken, refreshToken, profile, done) => {
  process.nextTick(() => done(null, profile));
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware: Login kontrolü
function checkAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// ===== ROUTES =====

// Ana sayfa
app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

// Login sayfası görüntüle
app.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('login');
});

// Discord OAuth başlat
app.get('/auth/discord', passport.authenticate('discord'));

// OAuth callback
app.get('/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => res.redirect('/dashboard')
);

// Logout
app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

// Dashboard (Giriş gerekli)
app.get('/dashboard', checkAuth, (req, res) => {
  res.render('dashboard', { 
    user: req.user,
    stats: {
      toplamBasvuru: 156,
      bekleyen: 12,
      kabul: 98,
      red: 46
    }
  });
});

// Başvurular
app.get('/applications', checkAuth, (req, res) => {
  // Örnek veri - gerçekte database'den çekilecek
  const applications = [
    { id: 1, user: 'Ahmet#1234', type: 'Klan', status: 'Bekliyor', date: '2026-02-01' },
    { id: 2, user: 'Mehmet#5678', type: 'Yetkili', status: 'Kabul', date: '2026-01-31' },
    { id: 3, user: 'Ayşe#9999', type: 'Partner', status: 'Red', date: '2026-01-30' }
  ];
  res.render('applications', { user: req.user, applications });
});

// Ayarlar
app.get('/settings', checkAuth, (req, res) => {
  res.render('settings', { user: req.user });
});

// API - Başvuru kabul/red
app.post('/api/application/:id/:action', checkAuth, (req, res) => {
  const { id, action } = req.params;
  // Burada başvuruyu kabul/red et
  console.log(`Başvuru ${id} ${action} edildi`);
  res.json({ success: true, message: `Başvuru ${action} edildi` });
});

// ===== SERVER START =====
app.listen(PORT, () => {
  console.log(`🌐 Web panel: http://localhost:${PORT}`);
});
