import { BotHealth } from '../types/genome';

export interface DeathCheckResult {
  bot_id: string;
  isDead: boolean;
  isFlaggedWarning: boolean;
  triggersHit: ('consecutive_losses' | 'win_rate' | 'drawdown')[];
  deathReasons: string[];
  compositeScore: number;
}

export const deathMonitor = {
  /**
   * Evaluates a bot's current metrics against the 3 PRD Death Triggers
   */
  evaluateHealth(
    bot_id: string,
    stats: {
      consecutiveLosses: number;
      winRate: number; // e.g. 38 for 38%
      totalTrades: number;
      currentDrawdown: number; // e.g. 16.5 for 16.5% drawdown
      sharpe30d: number;
      flaggedWarningTimestamp?: string | null; // ISO timestamp if previously flagged
    },
    isChampion: boolean = false
  ): DeathCheckResult {
    const triggersHit: ('consecutive_losses' | 'win_rate' | 'drawdown')[] = [];
    const deathReasons: string[] = [];

    // Trigger 1: 5 consecutive losses
    const trigger1Hit = stats.consecutiveLosses >= 5;
    if (trigger1Hit) {
      if (!isChampion) {
        triggersHit.push('consecutive_losses');
        deathReasons.push('Hit 5 consecutive losses');
      } else {
        console.log(`Bot ${bot_id} hit Trigger 1 (5 consecutive losses), but is protected by Champion Crown.`);
      }
    }

    // Trigger 2: Win rate < 40% over last 20 trades
    const trigger2Hit = stats.totalTrades >= 20 && stats.winRate < 40;
    if (trigger2Hit) {
      if (!isChampion) {
        triggersHit.push('win_rate');
        deathReasons.push(`Rolling win rate dropped to ${stats.winRate.toFixed(1)}% (< 40%)`);
      } else {
        console.log(`Bot ${bot_id} hit Trigger 2 (Win rate < 40%), but is protected by Champion Crown.`);
      }
    }

    // Trigger 3: Drawdown >= 15% (Hard drawdown - kills ALL bots including Champion)
    const trigger3Hit = stats.currentDrawdown >= 15;
    if (trigger3Hit) {
      triggersHit.push('drawdown');
      deathReasons.push(`Capital drawdown reached ${stats.currentDrawdown.toFixed(1)}% (>= 15%)`);
    }

    // Evaluate death conditions:
    // A bot dies if:
    // 1. 2 of 3 triggers hit simultaneously
    // 2. Trigger 3 (hard drawdown) is hit
    // 3. 1 trigger was flagged and 24 hours have passed without recovery
    let isDead = false;
    let isFlaggedWarning = false;

    if (triggersHit.length >= 2 || trigger3Hit) {
      isDead = true;
    } else if (triggersHit.length === 1) {
      isFlaggedWarning = true;
      if (stats.flaggedWarningTimestamp) {
        const flaggedDate = new Date(stats.flaggedWarningTimestamp).getTime();
        const now = new Date().getTime();
        const hoursElapsed = (now - flaggedDate) / (1000 * 60 * 60);

        if (hoursElapsed >= 24) {
          isDead = true;
          deathReasons.push('Warning trigger persisted past 24-hour confirmation window');
        }
      }
    }

    // Calculate Composite Health Score (0 to 100)
    // 100 = Perfect Health, 0 = Critical / Dead
    let healthScore = 100;
    healthScore -= stats.currentDrawdown * 4; // -4 pts per 1% drawdown
    healthScore -= stats.consecutiveLosses * 10; // -10 pts per consecutive loss
    if (stats.totalTrades >= 10 && stats.winRate < 50) {
      healthScore -= (50 - stats.winRate) * 1.5; // Penalty for low win rate
    }

    const compositeScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    return {
      bot_id,
      isDead,
      isFlaggedWarning,
      triggersHit,
      deathReasons,
      compositeScore,
    };
  }
};
