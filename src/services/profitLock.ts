export interface ProfitLockResult {
  isLockActive: boolean;
  dayStartValue: number;
  peakValue: number;
  currentValue: number;
  peakGainUsd: number;
  protectedFloorUsd: number; // The portfolio equity floor
  tightenedStopLoss?: number;
  reason: string;
}

export const profitLock = {
  /**
   * Computes the daily high-water mark profit lock floor protecting 70% of peak gains
   */
  evaluateProfitLock(
    dayStartValue: number,
    peakValue: number,
    currentValue: number,
    positionDetails?: { entryPrice: number; currentStopLoss: number; isLong: boolean }
  ): ProfitLockResult {
    const peakGainUsd = peakValue - dayStartValue;

    if (peakGainUsd <= 0) {
      return {
        isLockActive: false,
        dayStartValue,
        peakValue,
        currentValue,
        peakGainUsd: 0,
        protectedFloorUsd: dayStartValue,
        reason: 'No daily profit lock active (daily peak gain <= $0).',
      };
    }

    // Protect 70% of peak daily gains (never give back > 30% of day's peak gain)
    const protectedFloorUsd = dayStartValue + (peakGainUsd * 0.70);

    let tightenedStopLoss = positionDetails?.currentStopLoss;
    if (positionDetails) {
      // If portfolio equity is near floor, compute corresponding tightened stop loss price
      const priceGainRatio = currentValue > 0 ? (protectedFloorUsd / currentValue) : 1.0;
      if (positionDetails.isLong) {
        const calculatedFloorStop = positionDetails.entryPrice * Math.min(1.0, priceGainRatio);
        tightenedStopLoss = Math.max(positionDetails.currentStopLoss, calculatedFloorStop);
      }
    }

    return {
      isLockActive: true,
      dayStartValue,
      peakValue,
      currentValue,
      peakGainUsd: parseFloat(peakGainUsd.toFixed(2)),
      protectedFloorUsd: parseFloat(protectedFloorUsd.toFixed(2)),
      tightenedStopLoss: tightenedStopLoss ? parseFloat(tightenedStopLoss.toFixed(4)) : undefined,
      reason: `Profit Lock Active: Protecting 70% of peak daily gain (+$${peakGainUsd.toFixed(2)}). Portfolio floor set to $${protectedFloorUsd.toFixed(2)}.`,
    };
  }
};
