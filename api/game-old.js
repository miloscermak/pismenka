// Vercel Serverless API pro Písmenka_
// Používá Upstash Redis jako databázi (zdarma tier)

const ADMIN_PASSWORD = 'PismenkaAdmin2024!';

// Globální persistent storage pro Vercel
// Poznámka: V produkci použij Upstash Redis nebo database
globalThis.gameData = globalThis.gameData || {
  currentGame: null,
  results: [],
  archive: []
};
const gameData = globalThis.gameData;

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
  // Seed pro konzistentní denní slovo
  const seed = date.split('-').join('');
  const index = parseInt(seed) % WORDS.length;
  return WORDS[index];
}

function corsHeaders(req) {
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
    return res.status(200).setHeader(corsHeaders(req)).end();
  }

  // Set CORS headers
  Object.entries(corsHeaders(req)).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const { action } = req.method === 'GET' ? req.query : req.body;
  const today = getTodayDate();

  try {
    switch (action) {
      case 'get_current_word':
        await getCurrentWord(req, res, today);
        break;
        
      case 'submit_result':
        await submitResult(req, res, today);
        break;
        
      case 'get_leaderboard':
        await getLeaderboard(req, res, today);
        break;
        
      case 'admin_set_word':
        await adminSetWord(req, res, today);
        break;
        
      case 'admin_get_stats':
        await adminGetStats(req, res);
        break;
        
      case 'get_archive':
        await getArchive(req, res);
        break;
        
      case 'health_check':
        res.status(200).json({
          status: 'OK',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          platform: 'Vercel'
        });
        break;
        
      default:
        res.status(400).json({ error: 'Neznámá akce' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Interní chyba serveru' });
  }
}

async function getCurrentWord(req, res, today) {
  // Zkontroluj zda je nastavené slovo pro dnes
  const todayGame = gameData.currentGame;
  
  if (todayGame && todayGame.date === today) {
    res.status(200).json({
      word: todayGame.word,
      date: today,
      success: true
    });
  } else {
    // Automatické denní slovo
    const word = getDailyWord(today);
    
    // Uložit do "databáze"
    gameData.currentGame = {
      word: word,
      date: today,
      created_at: new Date().toISOString()
    };
    
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
  
  // Debug logging
  console.log('Submit result:', {
    submittedWord: word,
    currentGame: gameData.currentGame,
    today: today,
    dailyWord: getDailyWord(today)
  });
  
  // Dočasně zakázáno pro debugging
  // TODO: Znovu povolit kontrolu slova
  /*
  const currentGame = gameData.currentGame;
  if (!currentGame || currentGame.date !== today) {
    const dailyWord = getDailyWord(today);
    if (word !== dailyWord) {
      return res.status(400).json({ 
        error: 'Neplatné slovo',
        debug: { submitted: word, expected: dailyWord, date: today }
      });
    }
  } else if (currentGame.word !== word) {
    return res.status(400).json({ 
      error: 'Neplatné slovo',
      debug: { submitted: word, expected: currentGame.word, date: today }
    });
  }
  */
  
  // Anti-spam: IP adresa
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Kontrola limitu na IP (max 10 za den)
  const todayResults = gameData.results.filter(r => r.date === today && r.ip_address === ipAddress);
  if (todayResults.length >= 10) {
    return res.status(429).json({ error: 'Příliš mnoho pokusů za den' });
  }
  
  // Uložit výsledek
  const result = {
    id: Date.now(), // Simple ID
    word,
    moves: parseInt(moves),
    time: parseInt(time),
    player_name: playerName,
    date: today,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: new Date().toISOString()
  };
  
  gameData.results.push(result);
  
  res.status(200).json({ success: true, message: 'Výsledek uložen' });
}

async function getLeaderboard(req, res, today) {
  // Filtruj výsledky pro dnešek
  const todayResults = gameData.results
    .filter(r => r.date === today)
    .sort((a, b) => {
      if (a.moves !== b.moves) return a.moves - b.moves;
      return a.time - b.time;
    })
    .slice(0, 50);
  
  const leaderboard = todayResults.map((result, index) => ({
    rank: index + 1,
    player_name: result.player_name,
    moves: result.moves,
    time: result.time,
    created_at: result.created_at
  }));
  
  const totalPlayers = todayResults.length;
  
  res.status(200).json({
    leaderboard,
    date: today,
    total_players: totalPlayers,
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
  gameData.currentGame = {
    word: newWord,
    date: today,
    created_at: new Date().toISOString()
  };
  
  res.status(200).json({
    success: true,
    message: `Nové slovo nastaveno: ${newWord}`,
    word: newWord
  });
}

async function archivePreviousDay(today) {
  const yesterday = new Date(Date.parse(today) - 86400000).toISOString().split('T')[0];
  
  // Získat top 10 z předchozího dne
  const yesterdayResults = gameData.results
    .filter(r => r.date === yesterday)
    .sort((a, b) => {
      if (a.moves !== b.moves) return a.moves - b.moves;
      return a.time - b.time;
    })
    .slice(0, 10);
  
  if (yesterdayResults.length > 0) {
    const totalPlayers = gameData.results.filter(r => r.date === yesterday).length;
    
    const archiveEntry = {
      word: yesterdayResults[0].word,
      date: yesterday,
      top10: yesterdayResults.map(r => ({
        player_name: r.player_name,
        moves: r.moves,
        time: r.time,
        word: r.word
      })),
      total_players: totalPlayers,
      created_at: new Date().toISOString()
    };
    
    // Uložit do archivu
    gameData.archive.push(archiveEntry);
    
    // Udržovat pouze posledních 30 dní
    gameData.archive = gameData.archive.slice(-30);
  }
}

async function adminGetStats(req, res) {
  const { admin_password } = req.body;
  
  if (admin_password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Neplatné admin heslo' });
  }
  
  const today = getTodayDate();
  
  // Statistiky
  const uniquePlayers = new Set(gameData.results.map(r => r.player_name)).size;
  const totalGames = gameData.results.length;
  const todayGames = gameData.results.filter(r => r.date === today).length;
  const archivedDays = gameData.archive.length;
  
  // Top hráč
  const playerCounts = {};
  gameData.results.forEach(r => {
    playerCounts[r.player_name] = (playerCounts[r.player_name] || 0) + 1;
  });
  
  const topPlayer = Object.entries(playerCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Žádný';
  
  res.status(200).json({
    total_players: uniquePlayers,
    total_games: totalGames,
    today_games: todayGames,
    archived_days: archivedDays,
    top_player: topPlayer,
    success: true
  });
}

async function getArchive(req, res) {
  const archive = gameData.archive
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 30);
  
  res.status(200).json({
    archive,
    success: true
  });
}