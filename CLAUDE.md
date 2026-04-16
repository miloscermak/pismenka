# Písmenka – Word Sliding Puzzle

## Co to je
Denní slovní hra typu "osmička" (sliding puzzle 3x3) s českými 8-písmenný slovy. Všichni hráči řeší každý den stejné slovo. Výsledky se zapisují do žebříčku.

## Tech stack
- **Frontend:** Vanilla HTML + CSS + JS (vše v `public/index.html`, 1 soubor)
- **Backend:** Node.js serverless funkce (Vercel Functions) v `api/`
- **Databáze:** Upstash Redis (REST API), s fallbackem na in-memory storage
- **Deploy:** Aktuálně Vercel, plánovaný přesun na Netlify

## Struktura projektu
```
index.html          # Redirect na public/index.html
vercel.json         # Vercel konfigurace
package.json        # Závislosti (@upstash/redis)
public/
  index.html        # Hlavní hra (UI + game logic, ~1000 řádků)
  admin.html        # Admin panel (nastavení slova, statistiky)
api/
  game.js           # API handler – všechny endpointy
  db.js             # Databázová vrstva (Redis / in-memory fallback)
  game-old.js       # Stará verze (jen in-memory, nepoužívá se)
```

## API endpointy
- `GET /api/game?action=get_current_word` – aktuální slovo dne
- `POST /api/game` action=submit_result – odeslání výsledku
- `GET /api/game?action=get_leaderboard` – žebříček dne
- `GET /api/game?action=get_archive` – archiv posledních 30 dnů
- `GET /api/game?action=health_check` – health check
- `POST /api/game` action=admin_set_word – nastavení nového slova (admin)
- `POST /api/game` action=admin_get_stats – statistiky (admin)

## Herní mechanika
- Slovník 50+ českých 8-písmenných slov (hardcoded v `api/game.js`)
- Denní slovo se vybírá deterministicky podle data: `parseInt(YYYYMMDD) % words.length`
- Puzzle se generuje na frontendu, kontrola řešitelnosti pomocí počtu inverzí
- Žebříček: řazení primárně podle počtu tahů, sekundárně podle času
- Anti-spam: max 10 odeslání na IP za den

## Env proměnné
- `UPSTASH_REDIS_REST_URL` – URL Upstash Redis (volitelné)
- `UPSTASH_REDIS_REST_TOKEN` – token Upstash Redis (volitelné)
- `ADMIN_PASSWORD` – heslo pro admin panel (default: `PismenkaAdmin2024!`)

## Lokální vývoj
```bash
npm install
npm run dev   # spustí Vercel CLI dev server
```

## Poznámky
- Frontend je celý v jednom HTML souboru (inline CSS + JS)
- `game-old.js` je legacy verze, nepoužívá se
- Admin panel: `/admin.html`
- Při přesunu na Netlify bude potřeba přepsat serverless funkce z Vercel formátu na Netlify Functions
