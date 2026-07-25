import { RegimeType } from './regime';

export interface SizingResult {
  allowed: boolean;
  baseMaxPct: number; // Max size based on confidence tier
  regimeMultiplier: number; // Multiplier based on regime
  finalSizingPct: number; // Final position size % of bot capital
  reason: string;
}

export const REGIME_MULTIPLIERS: Record<RegimeType, number> = {
  CRASH: 0.0,
  BEAR: 0.25,
  NEUTRAL: 0.75,
  BULL: 1.0,
  EUPHORIA: 0.5,
};

export const positionSizing = {
  /**
   * Computes the maximum position size percentage of bot capital based on Opus confidence score and regime.
   */
  calculatePositionSize(confidence: number, regime: RegimeType): SizingResult {
    if (confidence < 0.50) {
      return {
        allowed: false,
        baseMaxPct: 0,
        regimeMultiplier: REGIME_MULTIPLIERS[regime] ?? 0.75,
        finalSizingPct: 0,
        reason: `Signal rejected: Opus confidence score ${confidence.toFixed(2)} is below minimum threshold (0.50)`,
      };
    }

    let baseMaxPct = 0;
    if (confidence <= 0.64) {
      baseMaxPct = 5.0; // Micro position
    } else if (confidence <= 0.74) {
      baseMaxPct = 10.0; // Small position
    } else if (confidence <= 0.84) {
      baseMaxPct = 15.0; // Normal position
    } else {
      baseMaxPct = 20.0; // Full position (hard cap)
    }

    const regimeMultiplier = REGIME_MULTIPLIERS[regime] ?? 0.75;
    const rawSize = baseMaxPct * regimeMultiplier;

    // Hard cap at 20% max per trade
    const finalSizingPct = parseFloat(Math.min(20.0, Math.max(0, rawSize)).toFixed(2));

    if (finalSizingPct === 0) {
      return {
        allowed: false,
        baseMaxPct,
        regimeMultiplier,
        finalSizingPct: 0,
        reason: `Position size reduced to 0% due to ${regime} regime multiplier (0x)`,
      };
    }

    return {
      allowed: true,
      baseMaxPct,
      regimeMultiplier,
      finalSizingPct,
      reason: `Sized at ${finalSizingPct}% of bot capital (Confidence: ${confidence.toFixed(2)}, Regime: ${regime} [${regimeMultiplier}x])`,
    };
  }
};
