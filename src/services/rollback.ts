import { BotGenome } from '../types/genome';
import { getDb } from './db';

export interface RollbackEvaluation {
  bot_id: string;
  shouldRollback: boolean;
  preMutationWinRate: number;
  postMutationWinRate: number;
  performanceDelta: number; // percentage change
  restoredGenome?: BotGenome;
  reason: string;
}

export const rollbackManager = {
  /**
   * Records a versioned mutation snapshot before applying a genome change
   */
  async recordMutation(
    bot_id: string,
    mutationType: 'auto' | 'manual',
    genomeBefore: BotGenome,
    genomeAfter: BotGenome,
    triggerReason: string
  ): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO genome_mutations (bot_id, mutation_type, genome_before, genome_after, trigger_reason) 
         VALUES (?, ?, ?, ?, ?)`,
        bot_id,
        mutationType,
        JSON.stringify(genomeBefore),
        JSON.stringify(genomeAfter),
        triggerReason
      );
      console.log(`✅ Versioned genome mutation recorded in SQLite for bot ${bot_id}`);
    } catch (err) {
      console.warn('Could not record mutation snapshot in SQLite:', err instanceof Error ? err.message : String(err));
    }
  },

  /**
   * Evaluates post-mutation performance over 15 trades.
   * Auto-reverts genome if win rate drops > 10% post-mutation.
   */
  async evaluateRollback(
    bot_id: string,
    preMutationTrades: Array<{ pnl_pct: number }>,
    postMutationTrades: Array<{ pnl_pct: number }>
  ): Promise<RollbackEvaluation> {
    const EVALUATION_WINDOW = 15;

    if (postMutationTrades.length < EVALUATION_WINDOW) {
      return {
        bot_id,
        shouldRollback: false,
        preMutationWinRate: 0,
        postMutationWinRate: 0,
        performanceDelta: 0,
        reason: `Evaluation in progress (${postMutationTrades.length}/${EVALUATION_WINDOW} post-mutation trades)`,
      };
    }

    const calculateWinRate = (trades: Array<{ pnl_pct: number }>) => {
      if (trades.length === 0) return 0;
      const wins = trades.filter(t => t.pnl_pct > 0).length;
      return (wins / trades.length) * 100;
    };

    const preWinRate = calculateWinRate(preMutationTrades.slice(-EVALUATION_WINDOW));
    const postWinRate = calculateWinRate(postMutationTrades.slice(0, EVALUATION_WINDOW));
    const delta = postWinRate - preWinRate;

    // Rollback Trigger: Win rate drops > 10% post-mutation
    if (delta < -10.0) {
      let restoredGenome: BotGenome | undefined;

      try {
        const db = await getDb();
        const latestMutation: any = await db.getFirstAsync(
          `SELECT * FROM genome_mutations WHERE bot_id = ? AND rolled_back = 0 ORDER BY applied_at DESC LIMIT 1`,
          bot_id
        );

        if (latestMutation && latestMutation.genome_before) {
          restoredGenome = JSON.parse(latestMutation.genome_before);

          // Update bots table to restore pre-mutation genome
          await db.runAsync(
            `UPDATE bots SET genome = ? WHERE id = ?`,
            JSON.stringify(restoredGenome),
            bot_id
          );

          // Mark mutation as rolled back
          await db.runAsync(
            `UPDATE genome_mutations SET rolled_back = 1, performance_delta = ? WHERE id = ?`,
            delta,
            latestMutation.id
          );

          console.log(`⚠️ SAFETY ROLLBACK EXECUTED for bot ${bot_id}: Genome restored to pre-mutation snapshot.`);
        }
      } catch (err) {
        console.warn('Rollback execution in SQLite failed:', err instanceof Error ? err.message : String(err));
      }

      return {
        bot_id,
        shouldRollback: true,
        preMutationWinRate: parseFloat(preWinRate.toFixed(1)),
        postMutationWinRate: parseFloat(postWinRate.toFixed(1)),
        performanceDelta: parseFloat(delta.toFixed(1)),
        restoredGenome,
        reason: `Post-mutation win rate dropped by ${Math.abs(delta).toFixed(1)}% (> 10% threshold). Reverted to pre-mutation genome snapshot.`,
      };
    }

    return {
      bot_id,
      shouldRollback: false,
      preMutationWinRate: parseFloat(preWinRate.toFixed(1)),
      postMutationWinRate: parseFloat(postWinRate.toFixed(1)),
      performanceDelta: parseFloat(delta.toFixed(1)),
      reason: `Mutation performance stable (delta: ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%)`,
    };
  }
};
