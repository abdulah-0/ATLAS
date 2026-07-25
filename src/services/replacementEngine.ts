import { BotGenome } from '../types/genome';
import { BotGenomeSchema } from '../schemas/genomeSchema';
import { openrouter, OPENROUTER_MODELS } from './openrouter';
import { RegimeType } from './regime';

export interface ReplacementContext {
  deadBot: {
    genome: BotGenome;
    deathTriggers: string[];
    tradeCount: number;
    finalPnlPct: number;
    regimeAtDeath: RegimeType;
  };
  survivors: Array<{
    genome: BotGenome;
    sharpe30d: number;
    winRate: number;
    generation: number;
  }>;
  currentRegime: RegimeType;
  regimeConfidence: number;
  marketContext: string;
}

export const replacementEngine = {
  /**
   * Generates a new successor BotGenome using Claude Opus via OpenRouter
   */
  async generateReplacement(context: ReplacementContext): Promise<BotGenome> {
    const nextGeneration = Math.max(
      context.deadBot.genome.generation + 1,
      ...context.survivors.map(s => s.genome.generation + 1)
    );

    const systemPrompt = `You are the ATLAS Strategy Evolution Engine powered by Claude Opus.
Your task is to generate a new valid BotGenome JSON object to replace a terminated trading bot.

Select one of three strategies:
1. MUTATE — Take the highest-performing survivor, alter 2-3 parameters, preserving ~80% of its genome.
2. CROSSOVER — Combine entry rules from one top survivor with exit rules from another.
3. GENERATE — Build a fresh strategy optimized for the current market regime: ${context.currentRegime}.

STRICT REQUIREMENT: Return ONLY a raw, valid JSON object matching the BotGenome schema. No markdown wrapping, no explanatory text, no code fences.`;

    const userPrompt = `Context:
- Dead Bot ID: ${context.deadBot.genome.bot_id} (${context.deadBot.genome.nickname})
- Death Reasons: ${context.deadBot.deathTriggers.join(', ')}
- Final P&L: ${context.deadBot.finalPnlPct.toFixed(2)}% over ${context.deadBot.tradeCount} trades
- Current Market Regime: ${context.currentRegime} (Confidence: ${(context.regimeConfidence * 100).toFixed(0)}%)
- Market Context: ${context.marketContext}
- Survivors (${context.survivors.length}): ${JSON.stringify(context.survivors, null, 2)}

Target Specification:
- New bot_id: "atlas_${String(Date.now()).slice(-4)}"
- Generation: ${nextGeneration}
- Parent IDs: ${JSON.stringify([context.deadBot.genome.bot_id, ...context.survivors.map(s => s.genome.bot_id)])}
- birth_timestamp: "${new Date().toISOString()}"

Generate the complete JSON for the new BotGenome.`;

    try {
      const responseText = await openrouter.chatComplete(
        OPENROUTER_MODELS.OPUS,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.3 }
      );

      // Clean response (strip any inadvertent markdown code block delimiters)
      let cleanedJson = responseText.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedObj = JSON.parse(cleanedJson);

      // Validate with Zod
      const validatedGenome = BotGenomeSchema.parse(parsedObj) as BotGenome;
      return validatedGenome;

    } catch (error) {
      console.warn('Opus strategy generation failed or produced invalid Zod schema. Generating fallback mutated genome:', error instanceof Error ? error.message : String(error));

      // Fallback: Mutate dead bot or best survivor directly in TypeScript
      const baseParent = context.survivors.length > 0
        ? context.survivors[0].genome
        : context.deadBot.genome;

      const fallbackGenome: BotGenome = {
        ...baseParent,
        bot_id: `atlas_${String(Math.floor(100 + Math.random() * 900))}`,
        nickname: `${baseParent.nickname} Mod-V2`,
        generation: nextGeneration,
        parent_ids: [baseParent.bot_id],
        birth_timestamp: new Date().toISOString(),
        created_by: 'mutation',
        entry: {
          ...baseParent.entry,
          rsi_entry: Math.max(15, Math.min(85, baseParent.entry.rsi_entry + (Math.random() > 0.5 ? 5 : -5))),
          volume_mult: parseFloat(Math.max(1.0, baseParent.entry.volume_mult + 0.2).toFixed(2)),
        },
        exit: {
          ...baseParent.exit,
          take_profit_rr: parseFloat(Math.max(1.5, baseParent.exit.take_profit_rr + 0.3).toFixed(2)),
          stop_loss_pct: parseFloat(Math.max(0.01, baseParent.exit.stop_loss_pct - 0.002).toFixed(3)),
        },
      };

      return BotGenomeSchema.parse(fallbackGenome) as BotGenome;
    }
  }
};
