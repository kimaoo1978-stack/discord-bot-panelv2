# Discord Bot Web Panel

Discord OAuth2 ile kullanıcı girişi yapabilen web panel.

## Özellikler

- ✅ Discord OAuth2 Login
- ✅ Kullanıcı Dashboard
- ✅ Sunucu listesi
- ✅ Session yönetimi

## Kurulum

1. Repository'yi klonlayın:
```bash
git clone https://github.com/YOUR_USERNAME/discord-bot-panel.git
cd discord-bot-panel
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. `.env` dosyası oluşturun:
```bash
cp .env.example .env
```

4. `.env` dosyasını Discord bilgilerinizle doldurun

5. Sunucuyu başlatın:
```bash
npm start
```

## Environment Variables

- `CLIENT_ID` - Discord Application Client ID
- `CLIENT_SECRET` - Discord Application Client Secret
- `REDIRECT_URI` - OAuth2 Redirect URI
- `SESSION_SECRET` - Güvenli random string
- `PORT` - Port numarası (varsayılan: 3000)

## Discord Developer Portal Ayarları

1. https://discord.com/developers/applications adresine gidin
2. Uygulamanızı seçin
3. OAuth2 → Redirects kısmına callback URL'inizi ekleyin
4. OAuth2 → URL Generator'da `identify`, `email`, `guilds` scope'larını seçin

## Deploy (Render)

1. GitHub'a push edin
2. Render'da "New Web Service" oluşturun
3. Repository'nizi seçin
4. Environment Variables'ı ekleyin
5. Deploy edin!

## Lisans

MIT
