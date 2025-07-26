# 🎯 Písmenka_ - Denní výzva

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/miloscermak/pismenka)

Konkurenční puzzle hra kde všichni hráči řeší stejné slovo každý den.

## 🚀 Živá demo

- **Hra:** [pismenka.vercel.app](https://pismenka.vercel.app)
- **Admin:** [pismenka.vercel.app/admin.html](https://pismenka.vercel.app/admin.html)

## ✨ Funkce

- 🎯 **Denní výzva** - Všichni řeší stejné 8písmenné slovo
- 🏆 **Realtime žebříček** - Seřazeno podle tahů a času
- 📊 **Admin panel** - Správa slov a statistiky
- 📱 **Responsive design** - Funguje na všech zařízeních
- ⚡ **Severless backend** - Škálovatelný a rychlý
- 🔒 **Anti-spam ochrana** - Limit pokusů na IP

## 🛠️ Technologie

- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Backend:** Vercel Serverless Functions (Node.js)
- **Databáze:** In-memory (pro demo), připraveno pro Redis/DB
- **Hosting:** Vercel (zdarma tier)

## 🚀 Nasazení

### 1-click deploy na Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/miloscermak/pismenka)

### Manuální nasazení

1. **Fork/clone repo**
```bash
git clone https://github.com/miloscermak/pismenka.git
cd pismenka
```

2. **Deploy na Vercel**
```bash
npm i -g vercel
vercel
```

3. **Nebo jiný hosting**
- Nahraj soubory na jakýkoliv static hosting
- API funkce fungují jen na Vercel/Netlify

## 🔐 Admin přístup

- **URL:** `your-domain.com/admin.html`
- **Heslo:** `PismenkaAdmin2024!`
- **Změna hesla:** Edituj `ADMIN_PASSWORD` v `api/game.js`

## 🎮 Jak hrát

1. Otevři hru v prohlížeči
2. Počkej na countdown (3-2-1-START!)
3. Klikáním nebo šipkami přesuň písmena
4. Seřaď správně dnešní slovo
5. Odešli výsledek a porovnej se s ostatními

## 📊 API

### Endpointy

- `GET /api/game?action=get_current_word` - Aktuální slovo dne
- `POST /api/game` + `action=submit_result` - Odeslání výsledku
- `GET /api/game?action=get_leaderboard` - Dnešní žebříček
- `POST /api/game` + `action=admin_set_word` - Admin: nové slovo
- `POST /api/game` + `action=admin_get_stats` - Admin: statistiky

### Příklad použití

```javascript
// Získání aktuálního slova
const response = await fetch('/api/game?action=get_current_word');
const data = await response.json();
console.log(data.word); // např. "KRÁLOVNA"

// Odeslání výsledku
await fetch('/api/game', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'submit_result',
    word: 'KRÁLOVNA',
    moves: 25,
    time: 120,
    player_name: 'Milan'
  })
});
```

## 🔧 Vývoj

```bash
# Lokální development
npm run dev

# Vercel CLI
vercel dev
```

## 📝 Konfigurace

V `api/game.js`:

```javascript
const ADMIN_PASSWORD = 'PismenkaAdmin2024!'; // Změň heslo
const WORDS = [...]; // Slovník českých slov
```

## 🔒 Bezpečnost

- ✅ CORS headers
- ✅ Input validace
- ✅ XSS ochrana  
- ✅ Rate limiting (10 pokusů/IP/den)
- ✅ Admin autentifikace

## 📱 PWA Ready

Hra je připravená pro Progressive Web App:
- Responsive design
- Offline capable (s service worker)
- Install prompt

## 🤝 Přispívání

1. Fork projekt
2. Vytvoř feature branch (`git checkout -b feature/nova-funkce`)
3. Commit změny (`git commit -am 'Přidej novou funkci'`)
4. Push branch (`git push origin feature/nova-funkce`)
5. Otevři Pull Request

## 📄 Licence

MIT License - viz [LICENSE](LICENSE) soubor.

## 🆘 Podpora

- 🐛 **Bug report:** [GitHub Issues](https://github.com/miloscermak/pismenka/issues)
- 💡 **Feature request:** [GitHub Discussions](https://github.com/miloscermak/pismenka/discussions)
- 📧 **Kontakt:** milos@example.com

---

**Vytvořeno s ❤️ pro denní zábavu!**

![Písmenka Screenshot](https://via.placeholder.com/800x400/667eea/white?text=Písmenka_+Screenshot)