// Database abstraction layer
// Supports both in-memory (fallback) and Upstash Redis

import { Redis } from '@upstash/redis';

let redis = null;
let useRedis = false;

// Initialize Redis if credentials are available
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      automaticDeserialization: true,
    });
    useRedis = true;
    console.log('🔗 Using Upstash Redis for persistence');
  } else {
    console.log('⚠️ No Redis credentials, using in-memory storage (not persistent)');
  }
} catch (error) {
  console.log('⚠️ Redis initialization failed, using in-memory storage:', error.message);
}

// Helper: Redis operace s timeoutem (5s), při selhání vrátí fallback
async function withTimeout(promise, fallback, timeoutMs = 5000) {
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), timeoutMs))
    ]);
  } catch (error) {
    console.error('Redis operation failed:', error.message);
    return fallback;
  }
}

// Fallback in-memory storage
const memoryStore = {
  currentGame: null,
  results: [],
  archive: []
};

export class GameDB {
  // Current game methods
  static async getCurrentGame() {
    if (useRedis) {
      return await withTimeout(redis.get('current_game'), memoryStore.currentGame);
    }
    return memoryStore.currentGame;
  }

  static async setCurrentGame(gameData) {
    if (useRedis) {
      const ok = await withTimeout(redis.set('current_game', gameData), false);
      if (!ok) memoryStore.currentGame = gameData;
      return !!ok;
    }
    memoryStore.currentGame = gameData;
    return true;
  }

  // Results methods
  static async getResults() {
    if (useRedis) {
      const results = await withTimeout(redis.get('results'), memoryStore.results);
      return Array.isArray(results) ? results : [];
    }
    return memoryStore.results;
  }

  static async addResult(result) {
    if (useRedis) {
      const results = await this.getResults();
      results.push(result);

      // Ponechat jen posledních 1000 výsledků
      if (results.length > 1000) {
        results.splice(0, results.length - 1000);
      }

      const ok = await withTimeout(redis.set('results', results), false);
      if (!ok) memoryStore.results.push(result);
      return !!ok;
    }
    memoryStore.results.push(result);
    return true;
  }

  static async getResultsForDate(date) {
    const allResults = await this.getResults();
    return allResults.filter(r => r.date === date);
  }

  // Archive methods
  static async getArchive() {
    if (useRedis) {
      const archive = await withTimeout(redis.get('archive'), memoryStore.archive);
      return Array.isArray(archive) ? archive : [];
    }
    return memoryStore.archive;
  }

  static async addToArchive(archiveEntry) {
    if (useRedis) {
      const archive = await this.getArchive();
      archive.push(archiveEntry);

      // Ponechat jen posledních 30 dnů
      if (archive.length > 30) {
        archive.splice(0, archive.length - 30);
      }

      const ok = await withTimeout(redis.set('archive', archive), false);
      if (!ok) memoryStore.archive.push(archiveEntry);
      return !!ok;
    }
    memoryStore.archive.push(archiveEntry);
    return true;
  }

  // Statistics methods
  static async getStats() {
    const results = await this.getResults();
    const archive = await this.getArchive();
    const today = new Date().toISOString().split('T')[0];
    
    const uniquePlayers = new Set(results.map(r => r.player_name)).size;
    const totalGames = results.length;
    const todayGames = results.filter(r => r.date === today).length;
    
    // Top player
    const playerCounts = {};
    results.forEach(r => {
      playerCounts[r.player_name] = (playerCounts[r.player_name] || 0) + 1;
    });
    
    const topPlayer = Object.entries(playerCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Žádný';
    
    return {
      total_players: uniquePlayers,
      total_games: totalGames,
      today_games: todayGames,
      archived_days: archive.length,
      top_player: topPlayer,
      using_redis: useRedis
    };
  }

  // Health check
  static async healthCheck() {
    const status = {
      database: useRedis ? 'Redis' : 'Memory',
      connected: true
    };

    if (useRedis) {
      try {
        await redis.ping();
        status.redis_ping = 'OK';
      } catch (error) {
        status.connected = false;
        status.redis_error = error.message;
      }
    }

    return status;
  }
}