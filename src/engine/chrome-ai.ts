export interface ChromeAICapabilities {
  available: boolean;
  promptAPI: boolean;
  summarizerAPI: boolean;
  translatorAPI: boolean;
  writerAPI: boolean;
  rewriterAPI: boolean;
}

export async function detectChromeAI(): Promise<ChromeAICapabilities> {
  const ai = (globalThis as Record<string, unknown>).ai as Record<string, unknown> | undefined;

  if (!ai) {
    return {
      available: false,
      promptAPI: false,
      summarizerAPI: false,
      translatorAPI: false,
      writerAPI: false,
      rewriterAPI: false,
    };
  }

  const hasLanguageModel = typeof ai.languageModel !== 'undefined';
  const hasSummarizer = typeof ai.summarizer !== 'undefined';
  const hasTranslator = typeof ai.translator !== 'undefined';
  const hasWriter = typeof ai.writer !== 'undefined';
  const hasRewriter = typeof ai.rewriter !== 'undefined';

  return {
    available: hasLanguageModel || hasSummarizer || hasTranslator,
    promptAPI: hasLanguageModel,
    summarizerAPI: hasSummarizer,
    translatorAPI: hasTranslator,
    writerAPI: hasWriter,
    rewriterAPI: hasRewriter,
  };
}

export async function chromeAIGenerate(
  prompt: string,
  options: { systemPrompt?: string; temperature?: number; topK?: number } = {}
): Promise<AsyncGenerator<string>> {
  const ai = (globalThis as Record<string, unknown>).ai as Record<string, unknown> | undefined;
  if (!ai || typeof ai.languageModel === 'undefined') {
    throw new Error('Chrome Prompt API not available');
  }

  const languageModel = ai.languageModel as {
    create: (config: Record<string, unknown>) => Promise<{
      prompt: (input: string) => Promise<string>;
      promptStreaming: (input: string) => ReadableStream<string>;
      destroy: () => void;
    }>;
  };

  const session = await languageModel.create({
    systemPrompt: options.systemPrompt || 'You are a helpful assistant.',
    temperature: options.temperature ?? 0.7,
    topK: options.topK ?? 3,
  });

  async function* generate(): AsyncGenerator<string> {
    try {
      const stream = session.promptStreaming(prompt);
      const reader = stream.getReader();
      let lastText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const newTokens = value.slice(lastText.length);
        if (newTokens) yield newTokens;
        lastText = value;
      }
    } finally {
      session.destroy();
    }
  }

  return generate();
}

export async function chromeAISummarize(
  text: string,
  _options: { type?: 'brief' | 'tldr' | 'key-points' | 'headline' } = {}
): Promise<string> {
  const ai = (globalThis as Record<string, unknown>).ai as Record<string, unknown> | undefined;
  if (!ai || typeof ai.summarizer === 'undefined') {
    throw new Error('Chrome Summarizer API not available');
  }

  const summarizer = ai.summarizer as {
    create: (config: Record<string, unknown>) => Promise<{
      summarize: (input: string) => Promise<string>;
      destroy: () => void;
    }>;
  };

  const session = await summarizer.create({
    type: 'key-points',
    format: 'plain-text',
    length: 'medium',
  });

  try {
    const result = await session.summarize(text);
    return result;
  } finally {
    session.destroy();
  }
}

export async function chromeAITranslate(
  text: string,
  srcLang: string,
  tgtLang: string
): Promise<string> {
  const ai = (globalThis as Record<string, unknown>).ai as Record<string, unknown> | undefined;
  if (!ai || typeof ai.translator === 'undefined') {
    throw new Error('Chrome Translator API not available');
  }

  const translator = ai.translator as {
    create: (config: Record<string, unknown>) => Promise<{
      translate: (input: string) => Promise<string>;
      destroy: () => void;
    }>;
  };

  const session = await translator.create({
    sourceLanguage: srcLang,
    targetLanguage: tgtLang,
  });

  try {
    const result = await session.translate(text);
    return result;
  } finally {
    session.destroy();
  }
}
