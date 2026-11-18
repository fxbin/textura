import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLanguageModelCoreOptions,
  buildSummarizerCoreOptions,
  collectLocalAiDiagnostics,
  createChromeBuiltInPromptSession,
  executeAiTask,
  getChromeBuiltInCapability,
  getChromeSummarizerCapability,
  prepareChromeSummarizer,
  routeAiExecution,
} from '../index.ts';
import type { AiApiConfig } from '@/store/useEditorStore';

const CLOUD_CONFIG: AiApiConfig = {
  provider: 'deepseek',
  apiKey: 'sk-test-key',
  model: 'deepseek-chat',
};

const EMPTY_CLOUD_CONFIG: AiApiConfig = {
  provider: 'none',
  apiKey: '',
  model: '',
};

type GlobalScope = Record<string, unknown>;

function makeStream(chunks: string[], delayMs = 0): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      for (const chunk of chunks) {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

function makeAbortableDelayedStream(
  firstChunk: string,
  waitMs: number,
  signal?: AbortSignal,
): ReadableStream<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  return new ReadableStream<string>({
    start(controller) {
      controller.enqueue(firstChunk);
      timer = setTimeout(() => {
        if (!closed) {
          closed = true;
          controller.enqueue(' second chunk');
          controller.close();
        }
      }, waitMs);

      signal?.addEventListener(
        'abort',
        () => {
          if (timer) clearTimeout(timer);
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              // ignore if already cancelled
            }
          }
        },
        { once: true },
      );
    },
    cancel() {
      closed = true;
      if (timer) clearTimeout(timer);
    },
  });
}

function createMockCloudFetch(content: string, onRequest?: () => void): typeof globalThis.fetch {
  return (async (_input: RequestInfo | URL, init?: RequestInit) => {
    onRequest?.();
    const parsed = init?.body ? (JSON.parse(String(init.body)) as { stream?: boolean }) : {};
    if (parsed.stream) {
      const sse = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(sse, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }
    return new Response(
      JSON.stringify({ choices: [{ message: { content } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof globalThis.fetch;
}

async function withMockEnv(
  overrides: {
    LanguageModel?: unknown;
    Summarizer?: unknown;
    window?: unknown;
    navigator?: unknown;
    fetch?: typeof globalThis.fetch;
  },
  fn: () => Promise<void> | void,
) {
  const g = globalThis as unknown as GlobalScope;
  const descriptors = {
    LanguageModel: Object.getOwnPropertyDescriptor(g, 'LanguageModel'),
    Summarizer: Object.getOwnPropertyDescriptor(g, 'Summarizer'),
    window: Object.getOwnPropertyDescriptor(g, 'window'),
    navigator: Object.getOwnPropertyDescriptor(g, 'navigator'),
    fetch: Object.getOwnPropertyDescriptor(g, 'fetch'),
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete g[key];
    } else {
      Object.defineProperty(g, key, {
        value,
        configurable: true,
        writable: true,
      });
    }
  }

  try {
    await fn();
  } finally {
    for (const [key, desc] of Object.entries(descriptors)) {
      if (desc) {
        Object.defineProperty(g, key, desc);
      } else {
        delete g[key];
      }
    }
  }
}

test('Prompt API passes identical core options to availability() and create()', async () => {
  const availabilityCalls: unknown[] = [];
  const createCalls: unknown[] = [];

  await withMockEnv(
    {
      window: { isSecureContext: true, location: { origin: 'https://textura.top' } },
      navigator: { userAgent: 'Chrome/138.0.0.0', userActivation: { isActive: true } },
      LanguageModel: {
        async availability(options: unknown) {
          availabilityCalls.push(options);
          return 'available';
        },
        async create(options: unknown) {
          createCalls.push(options);
          return {
            async prompt() {
              return 'ok';
            },
            promptStreaming() {
              return makeStream(['ok']);
            },
            destroy() {},
          };
        },
      },
    },
    async () => {
      const cap = await getChromeBuiltInCapability({
        inputLanguage: 'en',
        outputLanguage: 'en',
        systemPromptLanguage: 'en',
      });

      assert.equal(cap.availability, 'available');
      assert.equal(cap.apiPresent, true);
      assert.equal(cap.canCreateSession, true);

      const expectedCore = buildLanguageModelCoreOptions({
        inputLanguage: 'en',
        outputLanguage: 'en',
        systemPromptLanguage: 'en',
      });
      assert.deepEqual(availabilityCalls[0], {
        expectedInputs: expectedCore.expectedInputs,
        expectedOutputs: expectedCore.expectedOutputs,
      });

      const session = await createChromeBuiltInPromptSession({
        inputLanguage: 'en',
        outputLanguage: 'en',
        systemPromptLanguage: 'en',
        systemPrompt: 'System prompt',
      });
      session.destroy?.();

      const createArg = createCalls[0] as Record<string, unknown>;
      assert.deepEqual(createArg.expectedInputs, expectedCore.expectedInputs);
      assert.deepEqual(createArg.expectedOutputs, expectedCore.expectedOutputs);
    },
  );
});

test('Summarizer API detects independently and passes identical options to availability() and create()', async () => {
  const summarizerAvailabilityCalls: unknown[] = [];
  const summarizerCreateCalls: unknown[] = [];

  await withMockEnv(
    {
      window: { isSecureContext: true, location: { origin: 'https://textura.top' } },
      navigator: { userAgent: 'Chrome/138.0.0.0', userActivation: { isActive: true } },
      LanguageModel: {
        async availability() {
          return 'unavailable';
        },
      },
      Summarizer: {
        async availability(options: unknown) {
          summarizerAvailabilityCalls.push(options);
          return 'downloadable';
        },
        async create(options: unknown) {
          summarizerCreateCalls.push(options);
          return {
            async summarize() {
              return 'summary';
            },
            summarizeStreaming() {
              return makeStream(['summary']);
            },
            destroy() {},
          };
        },
      },
    },
    async () => {
      const promptCap = await getChromeBuiltInCapability({ inputLanguage: 'en' });
      const summarizerCap = await getChromeSummarizerCapability('en');

      assert.equal(promptCap.availability, 'unavailable');
      assert.equal(summarizerCap.availability, 'downloadable');
      assert.equal(summarizerCap.requiresDownload, true);

      const expectedCore = buildSummarizerCoreOptions('en');
      assert.deepEqual(summarizerAvailabilityCalls[0], expectedCore);
      assert.equal('preference' in (summarizerAvailabilityCalls[0] as object), false);

      await prepareChromeSummarizer('en');
      const createArg = summarizerCreateCalls[0] as Record<string, unknown>;
      assert.deepEqual(
        {
          type: createArg.type,
          format: createArg.format,
          length: createArg.length,
          expectedInputLanguages: createArg.expectedInputLanguages,
          outputLanguage: createArg.outputLanguage,
        },
        expectedCore,
      );
      assert.equal('preference' in createArg, false);
    },
  );
});

test('Browser compatibility matrix: Safari/Firefox/missing API & insecure context & availability errors', async () => {
  // 1. Safari / Firefox (no built-in APIs)
  await withMockEnv(
    {
      window: { isSecureContext: true, location: { origin: 'https://textura.top' } },
      navigator: {
        userAgent: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15',
      },
      LanguageModel: undefined,
      Summarizer: undefined,
    },
    async () => {
      const promptCap = await getChromeBuiltInCapability({ inputLanguage: 'zh' });
      const summarizerCap = await getChromeSummarizerCapability('zh');
      assert.equal(promptCap.availability, 'unavailable');
      assert.equal(promptCap.reason, 'api-missing');
      assert.equal(summarizerCap.availability, 'unavailable');
      assert.equal(summarizerCap.reason, 'api-missing');
    },
  );

  // 2. Insecure context
  await withMockEnv(
    {
      window: { isSecureContext: false, location: { origin: 'http://example.com' } },
      LanguageModel: { availability: async () => 'available' },
      Summarizer: { availability: async () => 'available' },
    },
    async () => {
      const promptCap = await getChromeBuiltInCapability({ inputLanguage: 'en' });
      const summarizerCap = await getChromeSummarizerCapability('en');
      assert.equal(promptCap.reason, 'insecure-context');
      assert.equal(summarizerCap.reason, 'insecure-context');
    },
  );

  // 3. availability() throws an exception -> preserved in errorMessage
  await withMockEnv(
    {
      window: { isSecureContext: true, location: { origin: 'https://textura.top' } },
      LanguageModel: {
        async availability() {
          throw new Error('GPU context lost');
        },
      },
    },
    async () => {
      const promptCap = await getChromeBuiltInCapability({ inputLanguage: 'en' });
      assert.equal(promptCap.availability, 'unavailable');
      assert.equal(promptCap.reason, 'availability-check-failed');
      assert.match(promptCap.errorMessage || '', /GPU context lost/);
    },
  );
});

test('Download requires user activation and normalizes both ratio and byte downloadprogress events', async () => {
  const progressValues: number[] = [];

  await withMockEnv(
    {
      window: { isSecureContext: true, location: { origin: 'https://textura.top' } },
      navigator: { userAgent: 'Chrome/138.0.0.0', userActivation: { isActive: false } },
      LanguageModel: {
        availability: async () => 'downloadable',
        create: async () => {
          throw new Error('Should not be called without user activation');
        },
      },
    },
    async () => {
      await assert.rejects(
        () => createChromeBuiltInPromptSession({ inputLanguage: 'en' }),
        (error: Error & { code?: string }) => error.code === 'user-activation-required',
      );
    },
  );

  await withMockEnv(
    {
      window: { isSecureContext: true, location: { origin: 'https://textura.top' } },
      navigator: { userAgent: 'Chrome/138.0.0.0', userActivation: { isActive: true } },
      Summarizer: {
        availability: async () => 'downloadable',
        create: async (opts: { monitor?: (m: { addEventListener: (t: string, cb: (e: { loaded: number; total?: number }) => void) => void }) => void }) => {
          opts.monitor?.({
            addEventListener(_type, cb) {
              cb({ loaded: 50, total: 200 });
              cb({ loaded: 0.75 });
              cb({ loaded: 200, total: 200 });
            },
          });
          return {
            summarize: async () => 'ok',
            summarizeStreaming: () => makeStream(['ok']),
            destroy() {},
          };
        },
      },
    },
    async () => {
      await prepareChromeSummarizer('en', (p) => progressValues.push(p));
      assert.deepEqual(progressValues, [0.25, 0.75, 1]);
    },
  );
});

test('Chinese input NEVER routes to local Prompt API or Summarizer API', async () => {
  let localCalled = false;
  let fetchCalled = 0;

  const mockFetch = createMockCloudFetch('云端已润色', () => {
    fetchCalled += 1;
  });

  await withMockEnv(
    {
      window: { isSecureContext: true, location: { origin: 'https://textura.top' } },
      LanguageModel: {
        availability: async () => 'available',
        create: async () => {
          localCalled = true;
          throw new Error('Local Prompt API must never run for Chinese input');
        },
      },
      Summarizer: {
        availability: async () => 'available',
        create: async () => {
          localCalled = true;
          throw new Error('Local Summarizer API must never run for Chinese input');
        },
      },
      fetch: mockFetch,
    },
    async () => {
      // Explicit Local rejects Chinese and NEVER calls Cloud
      for (const taskMode of ['polish', 'fix', 'expand', 'summarize'] as const) {
        const res = await executeAiTask({
          config: CLOUD_CONFIG,
          executionMode: 'chrome-built-in',
          content: '这是一段需要排版的中文公众号正文内容。',
          taskMode,
        });
        assert.equal(res.success, false);
        assert.equal(res.execution.provider, 'chrome-built-in');
      }
      assert.equal(localCalled, false);
      assert.equal(fetchCalled, 0);

      // Smart falls back to Cloud for Chinese without touching local APIs
      const smartPolish = await executeAiTask({
        config: CLOUD_CONFIG,
        executionMode: 'smart',
        content: '这是一段需要润色的中文文章。',
        taskMode: 'polish',
      });
      assert.equal(smartPolish.success, true);
      assert.equal(smartPolish.execution.provider, 'cloud');
      assert.equal(smartPolish.execution.fallback, true);
      assert.equal(localCalled, false);
      assert.equal(fetchCalled, 1);

      const smartSummarize = await executeAiTask({
        config: CLOUD_CONFIG,
        executionMode: 'smart',
        content: '这是一段需要摘要的中文文章。',
        taskMode: 'summarize',
      });
      assert.equal(smartSummarize.success, true);
      assert.equal(smartSummarize.execution.provider, 'cloud');
      assert.equal(smartSummarize.execution.fallback, true);
      assert.equal(localCalled, false);
      assert.equal(fetchCalled, 2);
    },
  );
});

test('Smart mode never auto-downloads downloadable model; English available routes locally', async () => {
  let createCalled = false;
  let fetchCalled = 0;

  const mockFetch = createMockCloudFetch('Cloud output', () => {
    fetchCalled += 1;
  });

  // 1. Downloadable -> Smart falls back to Cloud, NEVER calls create()
  await withMockEnv(
    {
      window: { isSecureContext: true, location: { origin: 'https://textura.top' } },
      LanguageModel: {
        availability: async () => 'downloadable',
        create: async () => {
          createCalled = true;
          throw new Error('Smart mode must not trigger download');
        },
      },
      Summarizer: {
        availability: async () => 'downloading',
        create: async () => {
          createCalled = true;
          throw new Error('Smart mode must not trigger download');
        },
      },
      fetch: mockFetch,
    },
    async () => {
      const polishRes = await executeAiTask({
        config: CLOUD_CONFIG,
        executionMode: 'smart',
        content: 'Hello world, this is an English paragraph for testing.',
        taskMode: 'polish',
      });
      assert.equal(polishRes.success, true);
      assert.equal(polishRes.execution.provider, 'cloud');
      assert.equal(polishRes.execution.fallback, true);

      const summarizeRes = await executeAiTask({
        config: CLOUD_CONFIG,
        executionMode: 'smart',
        content: 'Hello world, this is an English paragraph for summarizing.',
        taskMode: 'summarize',
      });
      assert.equal(summarizeRes.success, true);
      assert.equal(summarizeRes.execution.provider, 'cloud');
      assert.equal(summarizeRes.execution.fallback, true);
      assert.equal(createCalled, false);
      assert.equal(fetchCalled, 2);
    },
  );

  // 2. Available -> Smart uses local Prompt & Summarizer with zero network calls
  fetchCalled = 0;
  await withMockEnv(
    {
      window: { isSecureContext: true, location: { origin: 'https://textura.top' } },
      LanguageModel: {
        availability: async () => 'available',
        create: async () => ({
          prompt: async () => 'Polished locally',
          promptStreaming: () => makeStream(['Polished ', 'locally']),
          destroy() {},
        }),
      },
      Summarizer: {
        availability: async () => 'available',
        create: async () => ({
          summarize: async () => 'Summarized locally',
          summarizeStreaming: () => makeStream(['Summarized ', 'locally']),
          destroy() {},
        }),
      },
      fetch: mockFetch,
    },
    async () => {
      const chunks: string[] = [];
      const polishRes = await executeAiTask({
        config: EMPTY_CLOUD_CONFIG,
        executionMode: 'smart',
        content: 'This English sentence needs local polishing.',
        taskMode: 'polish',
        onChunk: (acc) => chunks.push(acc),
      });
      assert.equal(polishRes.success, true);
      assert.equal(polishRes.content, 'Polished locally');
      assert.equal(polishRes.execution.provider, 'chrome-built-in');
      assert.equal(polishRes.execution.fallback, false);
      assert.deepEqual(chunks, ['Polished ', 'Polished locally']);

      const sumRes = await executeAiTask({
        config: EMPTY_CLOUD_CONFIG,
        executionMode: 'smart',
        content: 'This English article needs local summarization.',
        taskMode: 'summarize',
        onChunk: () => {},
      });
      assert.equal(sumRes.success, true);
      assert.equal(sumRes.content, 'Summarized locally');
      assert.equal(sumRes.execution.provider, 'chrome-built-in');
      assert.equal(sumRes.execution.fallback, false);
      assert.equal(fetchCalled, 0);
    },
  );
});

test('User abort stops local streaming and NEVER falls back to Cloud even in Smart mode', async () => {
  let fetchCalled = 0;
  const mockFetch = (async () => {
    fetchCalled += 1;
    return new Response('should not happen', { status: 200 });
  }) as unknown as typeof globalThis.fetch;

  await withMockEnv(
    {
      window: { isSecureContext: true, location: { origin: 'https://textura.top' } },
      LanguageModel: {
        availability: async () => 'available',
        create: async (opts: { signal?: AbortSignal }) => ({
          prompt: async () => 'never',
          promptStreaming: (_input: string, streamOpts?: { signal?: AbortSignal }) =>
            makeAbortableDelayedStream('Partial ', 2000, streamOpts?.signal ?? opts.signal),
          destroy() {},
        }),
      },
      fetch: mockFetch,
    },
    async () => {
      const controller = new AbortController();
      const chunks: string[] = [];

      const res = await executeAiTask({
        config: CLOUD_CONFIG,
        executionMode: 'smart',
        content: 'English content streaming test.',
        taskMode: 'polish',
        signal: controller.signal,
        onChunk: (acc) => {
          chunks.push(acc);
          controller.abort();
        },
      });

      assert.equal(res.success, false);
      assert.equal(res.execution.reason, 'local-aborted');
      assert.equal(res.execution.provider, 'chrome-built-in');
      assert.equal(fetchCalled, 0);
      assert.deepEqual(chunks, ['Partial ']);
    },
  );
});

test('Router enforces explicit local unsupported task & diagnostics extracts runtime info', async () => {
  const formatRoute = routeAiExecution({
    mode: 'chrome-built-in',
    task: 'format',
    inputLanguage: 'en',
  });
  assert.equal(formatRoute.canExecute, false);
  assert.equal(formatRoute.reason, 'local-task-unsupported');
  assert.equal(formatRoute.fallbackAllowed, false);

  await withMockEnv(
    {
      window: { isSecureContext: true, location: { origin: 'https://textura.top' } },
      navigator: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/139.0.7258.0 Safari/537.36',
      },
      LanguageModel: { availability: async () => 'available' },
      Summarizer: { availability: async () => 'unavailable' },
    },
    async () => {
      const promptCap = await getChromeBuiltInCapability({ inputLanguage: 'en' });
      const summarizerCap = await getChromeSummarizerCapability('en');
      const report = collectLocalAiDiagnostics({
        promptCapability: promptCap,
        summarizerCapability: summarizerCap,
      });

      assert.equal(report.chromeVersion, 'Chrome 139.0.7258.0');
      assert.equal(report.origin, 'https://textura.top');
      assert.equal(report.isSecureContext, true);
      assert.equal(report.prompt.availability, 'available');
      assert.equal(report.summarizer.availability, 'unavailable');
      assert.equal(report.summarizer.reason, 'browser-unavailable');
    },
  );
});
