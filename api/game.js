// Vercel Serverless API pro Písmenka_ s perzistentní databází
import { GameDB } from './db.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PismenkaAdmin2024!';

// Slovník českých slov
const WORDS = [
  "UČITELKA", "KRÁLOVNA", "ZELENINA", "SLUNÍČKO", "ČOKOLÁDA", "KYSELINA", "PLAMEŇÁK", "HOLUBICE",
  "JEŠTĚRKA", "ANTILOPA", "POJISTKA", "SKLENICE", "ČLENSTVÍ", "MANŽELKA", "KOMUNITA", "SOFTWARE",
  "HARDWARE", "ALBATROS", "BAZILIKA", "KAPLIČKA", "PAPOUŠEK", "VELBLOUD", "ODBORNÍK", "ROZHOVOR",
  "HORIZONT", "NÁSTUPCE", "POKLADNA", "KOSTELÍK", "KALHOTKY", "JEDNOTKA", "SVĚTÝLKO", "MĚSÍČNÍK",
  "VYHLÁŠKA", "PAMĚTNÍK", "ZPĚVAČKA", "PRACOVNA", "PRAVOPIS", "ČERVENEC", "ČERVENKA", "LISTOPAD",
  "PROSINEC", "HOUSENKA", "BALERÍNA", "HOLČIČKA", "POPELNÍK", "LIMONÁDA", "ATEISMUS", "ŠÍLENOST",
  "PŘEDLOHA", "SKAUTING", "GILOTINA", "VČELAŘKA", "APLIKACE", "HOSPODÁŘ", "EKONOMKA", "EKOLOŽKA"
];

// Helper funkce
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getDailyWord(date) {
  const seed = date.split('-').join('');
  const index = parseInt(seed) % WORDS.length;
  return WORDS[index];
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

export default async function handler(req, res) {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader(corsHeaders()).end();
  }

  // Set CORS headers
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const { action } = req.method === 'GET' ? req.query : req.body;
  const today = getTodayDate();

  try {
    switch (action) {
      case 'get_current_word':
        await getCurrentWord(res, today);
        break;
        
      case 'submit_result':
        await submitResult(req, res, today);
        break;
        
      case 'get_leaderboard':
        await getLeaderboard(res, today);
        break;
        
      case 'admin_set_word':
        await adminSetWord(req, res, today);
        break;
        
      case 'admin_get_stats':
        await adminGetStats(res);
        break;
        
      case 'get_archive':
        await getArchive(res);
        break;
        
      case 'health_check':
        await healthCheck(res);
        break;
        
      default:
        res.status(400).json({ error: 'Neznámá akce' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Interní chyba serveru', details: error.message });
  }
}

async function getCurrentWord(res, today) {
  const todayGame = await GameDB.getCurrentGame();
  
  if (todayGame && todayGame.date === today) {
    res.status(200).json({
      word: todayGame.word,
      date: today,
      success: true
    });
  } else {
    const word = getDailyWord(today);
    
    await GameDB.setCurrentGame({
      word: word,
      date: today,
      created_at: new Date().toISOString()
    });
    
    res.status(200).json({
      word: word,
      date: today,
      success: true,
      auto_generated: true
    });
  }
}

async function submitResult(req, res, today) {
  const { word, moves, time, player_name } = req.body;
  
  // Validace
  if (!word || !moves || !time || moves <= 0 || time <= 0) {
    return res.status(400).json({ error: 'Neplatná data' });
  }
  
  if (moves > 1000 || time > 3600) {
    return res.status(400).json({ error: 'Podezřelé hodnoty' });
  }
  
  const playerName = (player_name || 'Anonym').slice(0, 30);
  
  // Kontrola aktuálního slova
  const currentGame = await GameDB.getCurrentGame();
  const expectedWord = currentGame?.word || getDailyWord(today);
  
  if (word !== expectedWord) {
    return res.status(400).json({ 
      error: 'Neplatné slovo',
      debug: { submitted: word, expected: expectedWord, date: today }
    });
  }
  
  // Anti-spam
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  const todayResults = await GameDB.getResultsForDate(today);
  const ipResults = todayResults.filter(r => r.ip_address === ipAddress);
  
  if (ipResults.length >= 10) {
    return res.status(429).json({ error: 'Příliš mnoho pokusů za den' });
  }
  
  // Uložit výsledek
  const result = {
    id: Date.now(),
    word,
    moves: parseInt(moves),
    time: parseInt(time),
    player_name: playerName,
    date: today,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: new Date().toISOString()
  };
  
  await GameDB.addResult(result);
  
  res.status(200).json({ success: true, message: 'Výsledek uložen' });
}

async function getLeaderboard(res, today) {
  const todayResults = await GameDB.getResultsForDate(today);
  
  const sorted = todayResults
    .sort((a, b) => {
      if (a.moves !== b.moves) return a.moves - b.moves;
      return a.time - b.time;
    })
    .slice(0, 10); // Zobrazit pouze top 10 v žebříčku
  
  const leaderboard = sorted.map((result, index) => ({
    rank: index + 1,
    player_name: result.player_name,
    moves: result.moves,
    time: result.time,
    created_at: result.created_at
  }));
  
  res.status(200).json({
    leaderboard,
    date: today,
    total_players: todayResults.length, // Celkový počet hráčů (všech výsledků)
    success: true
  });
}

async function adminSetWord(req, res, today) {
  const { admin_password, word } = req.body;
  
  if (admin_password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Neplatné admin heslo' });
  }
  
  const newWord = word.trim().toUpperCase();
  
  if (newWord.length !== 8) {
    return res.status(400).json({ error: 'Slovo musí mít přesně 8 písmen' });
  }
  
  if (!/^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]+$/.test(newWord)) {
    return res.status(400).json({ error: 'Slovo může obsahovat pouze písmena' });
  }
  
  // Archivovat předchozí den
  await archivePreviousDay(today);
  
  // Nastavit nové slovo
  await GameDB.setCurrentGame({
    word: newWord,
    date: today,
    created_at: new Date().toISOString()
  });
  
  res.status(200).json({
    success: true,
    message: `Nové slovo nastaveno: ${newWord}`,
    word: newWord
  });
}

async function archivePreviousDay(today) {
  const yesterday = new Date(Date.parse(today) - 86400000).toISOString().split('T')[0];
  
  const yesterdayResults = await GameDB.getResultsForDate(yesterday);
  const sorted = yesterdayResults
    .sort((a, b) => {
      if (a.moves !== b.moves) return a.moves - b.moves;
      return a.time - b.time;
    })
    .slice(0, 10);
  
  if (sorted.length > 0) {
    const archiveEntry = {
      word: sorted[0].word,
      date: yesterday,
      top10: sorted.map(r => ({
        player_name: r.player_name,
        moves: r.moves,
        time: r.time,
        word: r.word
      })),
      total_players: yesterdayResults.length,
      created_at: new Date().toISOString()
    };
    
    await GameDB.addToArchive(archiveEntry);
  }
}

async function adminGetStats(res) {
  const stats = await GameDB.getStats();
  res.status(200).json({ ...stats, success: true });
}

async function getArchive(res) {
  const archive = await GameDB.getArchive();
  const sorted = archive.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);
  
  res.status(200).json({
    archive: sorted,
    success: true
  });
}

async function healthCheck(res) {
  const dbHealth = await GameDB.healthCheck();
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    database: dbHealth
  });
}