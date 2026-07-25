import { secureStore, SECURE_KEYS } from './secureStore';

export const OPENROUTER_MODELS = {
  // Premium - Decisions, complex reasoning
  OPUS: 'anthropic/claude-3-opus',
  
  // Mid-Tier - Post-trade reflection, mutations
  SONNET: 'anthropic/claude-3.5-sonnet',
  
  // Cheap - News digests, confidence scoring
  HAIKU: 'anthropic/claude-3-haiku',
  
  // Free - Logs, basic utilities
  LLAMA_FREE: 'meta-llama/llama-3.1-8b-instruct:free',
  
  // Embedding model (OpenRouter or OpenAI direct)
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
      'HTTP-Referer': 'https://github.com/abdulah-0/ATLAS', // Required by OpenRouter
      'X-Title': 'ATLAS Autonomous Trading Bot',
    };
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

  /**
   * Generates a 1536-dimension embedding vector for the given text.
   * Routes to the embedding endpoint.
   */
  async getEmbedding(text: string): Promise<number[]> {
    const headers = await this.getHeaders();
    
    const body = {
      model: OPENROUTER_MODELS.EMBEDDING,
      input: text,
    };

    // OpenRouter supports standard OpenAI-compatible embeddings
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
