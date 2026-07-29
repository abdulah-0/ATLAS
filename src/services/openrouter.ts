import { secureStore, SECURE_KEYS } from './secureStore';
import { useSettingsStore } from '../store/settingsStore';
import { LLMTaskKey } from '../types/settings';

export const OPENROUTER_MODELS = {
  // Static defaults fallback
  OPUS: 'anthropic/claude-opus-4-6',
  SONNET: 'anthropic/claude-sonnet-4-6',
  HAIKU: 'anthropic/claude-haiku-4-5-20251001',
  LLAMA_FREE: 'meta-llama/llama-3.1-8b-instruct:free',
  EMBEDDING: 'openai/text-embedding-3-small',
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const openrouter = {
  async getHeaders() {
    const apiKey = await secureStore.getItem(SECURE_KEYS.OPENROUTER_API_KEY);
    
    if (!apiKey) {
      throw new Error('OpenRouter API key is not configured. Please set it in Settings.');
    }

    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/abdulah-0/ATLAS',
      'X-Title': 'ATLAS Autonomous Trading Bot',
    };
  },

  /**
   * Retrieves the configured model ID for a specific task from settings store
   */
  getModelForTask(taskKey: LLMTaskKey): string {
    try {
      const { settings } = useSettingsStore.getState();
      const assignment = settings.models[taskKey];
      if (assignment && assignment.modelId) {
        return assignment.modelId;
      }
    } catch (e) {
      console.log('Using default fallback model for task', taskKey);
    }
    return OPENROUTER_MODELS.OPUS;
  },

  async chatComplete(
    model: string,
    messages: ChatMessage[],
    options: {
      temperature?: number;
      max_tokens?: number;
      response_format?: { type: 'json_object' };
    } = {}
  ): Promise<string> {
    const headers = await this.getHeaders();
    const body = {
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens,
      response_format: options.response_format,
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter Call Failed: ${response.status} - ${errorText}`);
    }

    const data: ChatCompletionResponse = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content === undefined) {
      throw new Error('OpenRouter returned an empty response');
    }

    return content;
  },

  async getEmbedding(text: string): Promise<number[]> {
    const headers = await this.getHeaders();
    
    const body = {
      model: OPENROUTER_MODELS.EMBEDDING,
      input: text,
    };

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding Generation Failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const embedding = result.data?.[0]?.embedding;
    
    if (!embedding) {
      throw new Error('No embedding returned from API');
    }

    return embedding;
  }
};
