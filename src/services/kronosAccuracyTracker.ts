import { getDb } from './db';
import { StoredForecast } from '../types/kronos';

export async function recordForecastOutcome(
  tradeId: string,
  actualChangePct: number
): Promise<void> {
  try {
    const db = await getDb();
    const forecast = await db.getFirstAsync<StoredForecast>(
      `SELECT * FROM kronos_forecasts WHERE trade_id = ? LIMIT 1`,
      [tradeId]
    );

    if (!forecast) return;

    const predictedUp = forecast.direction === 'UP';
    const actuallyWentUp = actualChangePct > 0;
    const wasCorrect = predictedUp === actuallyWentUp && forecast.direction !== 'NEUTRAL';

    await db.runAsync(
      `UPDATE kronos_forecasts
       SET actual_change_pct = ?, was_correct = ?
       WHERE id = ?`,
      actualChangePct,
      wasCorrect ? 1 : 0,
      forecast.id
    );
  } catch (e) {
    console.warn('Failed to record forecast outcome:', e);
  }
}
