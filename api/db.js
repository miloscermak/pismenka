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
    });
    useRedis = true;
    console.log('🔗 Using Upstash Redis for persistence');
  } else {
    console.log('⚠️ No Redis credentials, using in-memory storage (not persistent)');
  }
} catch (error) {
  console.log('⚠️ Redis initialization failed, using in-memory storage:', error.message);
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
      try {
        const game = await redis.get('current_game');
        return game;
      } catch (error) {
        console.error('Redis getCurrentGame error:', error);
        return memoryStore.currentGame;
      }
    }
    return memoryStore.currentGame;
  }

  static async setCurrentGame(gameData) {
    if (useRedis) {
      try {
        await redis.set('current_game', gameData);
        return true;
      } catch (error) {
        console.error('Redis setCurrentGame error:', error);
        memoryStore.currentGame = gameData;
        return false;
      }
    }
    memoryStore.currentGame = gameData;
    return true;
  }

  // Results methods
  static async getResults() {
    if (useRedis) {
      try {
        const results = await redis.get('results') || [];
        return Array.isArray(results) ? results : [];
      } catch (error) {
        console.error('Redis getResults error:', error);
        return memoryStore.results;
      }
    }
    return memoryStore.results;
  }

  static async addResult(result) {
    if (useRedis) {
      try {
        const results = await this.getResults();
        results.push(result);
        
        // Keep only last 1000 results to save space
        if (results.length > 1000) {
          results.splice(0, results.length - 1000);
        }
        
        await redis.set('results', results);
        return true;
      } catch (error) {
        console.error('Redis addResult error:', error);
        memoryStore.results.push(result);
        return false;
      }
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
      try {
        const archive = await redis.get('archive') || [];
        return Array.isArray(archive) ? archive : [];
      } catch (error) {
        console.error('Redis getArchive error:', error);
        return memoryStore.archive;
      }
    }
    return memoryStore.archive;
  }

  static async addToArchive(archiveEntry) {
    if (useRedis) {
      try {
        const archive = await this.getArchive();
        archive.push(archiveEntry);
        
        // Keep only last 30 days
        if (archive.length > 30) {
          archive.splice(0, archive.length - 30);
        }
        
        await redis.set('archive', archive);
        return true;
      } catch (error) {
        console.error('Redis addToArchive error:', error);
        memoryStore.archive.push(archiveEntry);
        return false;
      }
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