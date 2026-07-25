export interface ProbationEvaluation {
  bot_id: string;
  isEvaluationComplete: boolean;
  tradesRemaining: number;
  passed: boolean;
  action: 'continue' | 'promote' | 'terminate';
  reason: string;
}

export const probationManager = {
  /**
   * Evaluates if a bot serving probation has completed its 20-trade evaluation
   * and whether it qualifies for promotion to active status.
   */
  evaluateProbation(
    bot_id: string,
    totalTrades: number,
    winRate: number, // percentage e.g. 52.0
    profitFactor: number // ratio gross profit / gross loss e.g. 1.25
  ): ProbationEvaluation {
    const PROBATION_WINDOW = 20;

    if (totalTrades < PROBATION_WINDOW) {
      return {
        bot_id,
        isEvaluationComplete: false,
        tradesRemaining: PROBATION_WINDOW - totalTrades,
        passed: false,
        action: 'continue',
        reason: `Probation in progress (${totalTrades}/${PROBATION_WINDOW} trades executed)`,
      };
    }

    // Evaluation window reached (>= 20 trades)
    const passedWinRate = winRate > 45.0;
    const passedProfitFactor = profitFactor > 1.0;
    const passed = passedWinRate && passedProfitFactor;

    if (passed) {
      return {
        bot_id,
        isEvaluationComplete: true,
        tradesRemaining: 0,
        passed: true,
        action: 'promote',
        reason: `Probation passed! Win rate ${winRate.toFixed(1)}% (> 45%) and Profit Factor ${profitFactor.toFixed(2)} (> 1.0)`,
      };
    } else {
      const failures: string[] = [];
      if (!passedWinRate) failures.push(`Win rate ${winRate.toFixed(1)}% (required > 45%)`);
      if (!passedProfitFactor) failures.push(`Profit Factor ${profitFactor.toFixed(2)} (required > 1.0)`);

      return {
        bot_id,
        isEvaluationComplete: true,
        tradesRemaining: 0,
        passed: false,
        action: 'terminate',
        reason: `Failed probation requirements: ${failures.join(', ')}`,
      };
    }
  }
};
