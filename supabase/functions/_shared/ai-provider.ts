export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiRequestOptions {
  messages: AiChatMessage[];
  tools?: unknown[];
  tool_choice?: unknown;
  temperature?: number;
  stream?: boolean;
}

export interface AiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AiChoice {
  index?: number;
  message?: {
    role: string;
    content?: string | null;
    tool_calls?: AiToolCall[];
  };
  finish_reason?: string;
}

export interface AiChatCompletionResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: AiChoice[];
}

export class AiGatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AiGatewayError";
  }
}

/**
 * Resolves AI provider URL, headers, and model based on configured environment variables.
 * Priority: GEMINI_API_KEY -> OPENAI_API_KEY -> LOVABLE_API_KEY.
 */
export function getAiConfig() {
  const geminiApiKey =
    Deno.env.get("GEMINI_API_KEY") ||
    Deno.env.get("GOOGLE_API_KEY") ||
    Deno.env.get("GOOGLE_GEMINI_API_KEY") ||
    Deno.env.get("GEMINI_KEY");
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const explicitProvider = Deno.env.get("AI_PROVIDER")?.toLowerCase();

  if (explicitProvider === "gemini" || geminiApiKey) {
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY (or GOOGLE_API_KEY) is not configured in Supabase Secrets");
    }
    return {
      provider: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: {
        Authorization: `Bearer ${geminiApiKey}`,
        "Content-Type": "application/json",
      },
      defaultModel: Deno.env.get("AI_MODEL") ?? "gemini-1.5-flash",
    };
  }

  if (explicitProvider === "openai" || openaiApiKey) {
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured in Supabase Secrets");
    }
    return {
      provider: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      defaultModel: Deno.env.get("AI_MODEL") ?? "gpt-4o-mini",
    };
  }

  if (lovableApiKey) {
    return {
      provider: "lovable",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      defaultModel: Deno.env.get("AI_MODEL") ?? "google/gemini-2.0-flash",
    };
  }

  throw new Error("No AI API key found. Please configure GEMINI_API_KEY (or GOOGLE_API_KEY) in Supabase Secrets.");
}

/**
 * Executes a chat completion against the configured AI provider.
 */
export async function executeAiChat(options: AiRequestOptions): Promise<Response> {
  const config = getAiConfig();

  const body: Record<string, unknown> = {
    model: config.defaultModel,
    messages: options.messages,
  };

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
  }
  if (options.tool_choice) {
    body.tool_choice = options.tool_choice;
  }
  if (typeof options.temperature === "number") {
    body.temperature = options.temperature;
  }
  if (options.stream) {
    body.stream = true;
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.clone().text().catch(() => "");
    console.error(`AI Provider (${config.provider}) error status ${response.status}:`, errorText);
  }

  return response;
}
