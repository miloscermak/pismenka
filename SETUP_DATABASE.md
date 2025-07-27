# 🗄️ Databáze Setup - Upstash Redis

## 🚀 Krok za krokem

### 1. Vytvoř Upstash účet
1. Jdi na: https://console.upstash.com/
2. **Sign up** s GitHub nebo email
3. **Zdarma tier** - žádná kreditka

### 2. Vytvoř Redis databázi
1. Klikni **"Create Database"**
2. **Name:** `pismenka-db`
3. **Region:** Europe (nejblíže k tobě)
4. **Type:** Regional (zdarma)
5. **Klikni "Create"**

### 3. Získej přístupové údaje
1. **V databázi klikni na "Connect"**
2. **Zkopíruj:**
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 4. Nastav v Vercel
1. **Jdi do Vercel dasboard**
2. **Vyber projekt "pismenka"**
3. **Settings → Environment Variables**
4. **Přidej:**
   ```
   UPSTASH_REDIS_REST_URL = твоя_url
   UPSTASH_REDIS_REST_TOKEN = твой_token
   ```
5. **Save**

### 5. Redeploy
1. **V Vercel: Deployments → tři tečky → Redeploy**
2. **Nebo:** Push cokoliv do GitHubu

## ✅ Test
- Otevři `tvuj-web.vercel.app/api/game?action=health_check`
- Měl by ukázat: `"database": "Redis"`

## 🔧 Fallback
Pokud Redis nefunguje, hra automaticky použije memory storage (nefunkční mezi počítači).

---

**📊 Co Redis ukládá:**
- ✅ Žebříček výsledků (perzistentní)
- ✅ Aktuální slovo dne
- ✅ Archiv předchozích dní
- ✅ Statistiky