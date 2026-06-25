export type ChatCompletionMessage = {
  role: 'user';
  content: string;
};

export type WebSearchOptions = {
  search_context_size?: 'low' | 'medium' | 'high';
};

export type AnswersRequestBody = {
  messages: ChatCompletionMessage[];
  model: 'brave' | 'brave-pro';
  stream: boolean;
  country?: string;
  language?: string;
  safesearch?: 'off' | 'moderate' | 'strict';
  max_completion_tokens?: number;
  enable_entities?: boolean;
  enable_citations?: boolean;
  enable_research?: boolean;
  research_allow_thinking?: boolean;
  research_maximum_number_of_tokens_per_query?: number;
  research_maximum_number_of_queries?: number;
  research_maximum_number_of_iterations?: number;
  research_maximum_number_of_seconds?: number;
  research_maximum_number_of_results_per_query?: number;
  web_search_options?: WebSearchOptions;
};

export type ChatCompletionResponse = {
  id: string;
  object: 'chat.completion';
  created: number;
  model: 'brave' | 'brave-pro';
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};
