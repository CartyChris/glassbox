/* ────────────────────────────────────────────────────────────────────────────
 * glassbox.d.ts — TypeScript declarations for the GlassBox automation surface.
 *
 * WHAT THIS IS
 *   GlassBox.html is a single-file browser app: one <script> block of some twenty-odd thousand lines,
 *   plain ES2020, no build step, no modules, no bundler. Near the end of that
 *   script it publishes its entire internals on `window.__gb` — every function
 *   and every piece of live state — so the app can be driven and inspected from
 *   the console, from a test harness, or from an injected automation script.
 *
 *   This file exists purely so an editor can autocomplete and type-check those
 *   automation/test scripts. It is a description of a running page, not a module
 *   you can import: nothing here is executable and the app does not read it.
 *
 * HOW TO USE IT
 *   Put it next to your script and reference it:
 *
 *     /// <reference path="./glassbox.d.ts" />
 *
 *     const t = window.__gb.spanTotals();
 *     console.log(t.reasoningShare);
 *
 *   Or type-check a whole folder with a tsconfig that has `"checkJs": true` and
 *   this file on the `include` list. Either way `window.__gb` becomes typed.
 *
 * HOW ACCURATE IS IT
 *   97 members carry a doc comment. Those were typed by hand, by reading the
 *   implementation — real return shapes, real defaults, real failure modes.
 *   A region header marked (*) contains at least one of them.
 *
 *   Every other member is mechanically derived from the source. Its name and
 *   arity are real, and an option-bag parameter lists the keys the code actually
 *   destructures, but the value types are `any`. Read an `any` here as "not
 *   checked yet", not as "untypeable".
 *
 *   Members declared `readonly` are getter-only on `window.__gb`; assigning to
 *   them silently does nothing at runtime.
 * ──────────────────────────────────────────────────────────────────────────── */

/* ═══════════════════ shared data shapes ═══════════════════ */

/** Every model call is `'llm'`; connector tool calls are `'tool'`. */
export type SpanKind = 'llm' | 'tool' | (string & {});

/** One node of the run tree. */
export interface Span {
  id: number;
  name: string;
  kind: SpanKind;
  /** Id of the enclosing span, or null for a root. */
  parent: number | null;
  /** `performance.now()` at open. */
  t0: number;
  /** `performance.now()` at close, null while open. */
  t1: number | null;
  /** Wall-clock duration, set by `spanEnd`. */
  ms?: number;
  meta: Record<string, any>;
  /** Only populated on the copies returned by `spanTree()`. */
  children: Span[];
  tokensIn: number;
  tokensOut: number;
  reasoningTokens: number;
  cost: number;
  error: string | null;
  /** First 4000 chars of the completion. */
  content: string;
  /** First 6000 chars of the reasoning trace. */
  reasoning: string;
  /** True when the response came from the semantic response cache. */
  cached?: boolean;
  /** Size of the prompt in characters — the input to the context-drop check. */
  ctxChars?: number;
}

export interface SpanTotals {
  calls: number;
  ms: number;
  /** Prompt tokens. */
  in: number;
  /** Completion tokens, reasoning included. */
  out: number;
  reasoning: number;
  cost: number;
  errors: number;
  cached: number;
  /** `out - reasoning`, floored at 0. */
  answerTokens: number;
  /** `reasoning / out`, 0 when nothing was emitted. */
  reasoningShare: number;
}

export type ReasoningFlagId =
  | 'circular'
  | 'empty-step'
  | 'all-thought-no-answer'
  | 'context-drop'
  | 'runaway-depth'
  | 'error-cascade'
  | (string & {});

export interface ReasoningFlag {
  id: ReasoningFlagId;
  sev: 'high' | 'med';
  /** Written to explain *why*, not just to raise a flag. */
  msg: string;
  /** Span ids implicated. Absent on trace-wide flags such as `runaway-depth`. */
  spans?: number[];
}

export interface ReasoningCheck {
  flags: ReasoningFlag[];
  /** False when any flag is `sev: 'high'`. */
  ok: boolean;
  /** How many `'llm'` spans were examined. */
  checked: number;
}

/* ── completions ── */

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  /** A plain string, or Anthropic-style content blocks when caching is explicit. */
  content: string | any[];
}

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
}

/** The streaming accumulator every completion returns. */
export interface Acc {
  text: string;
  summary: string;
  /** Reasoning as plain text, merged across `reasoning`, `reasoning_content` and `thinking` deltas. */
  reasoningPlain: string;
  encrypted: any[];
  content: string;
  details: Record<string, any>;
  rawFormat: string;
  usage: TokenUsage | null;
  cost: number | null;
  samples: any[];
  finishReason: string;
  continuations: number;
  annotations: any[];
  local?: boolean;
  runtime?: string | null;
  ctxChars?: number;
  cached?: boolean;
  elapsed?: number;
  ttft?: number;
  /** Similarity score when the response came from a *semantic* cache hit. */
  semanticHit?: number;
  degenerated?: boolean;
  intervention?: { retryWith?: Record<string, any> } | null;
  /** Still truncated after `MAX_CONTINUES` auto-continuations. */
  stillTruncated?: boolean;
  recoveredFromLoop?: boolean;
  loopedTwice?: boolean;
  /** Set by `withFallback` when another model finished the job. */
  fellBackFrom?: string;
}

/** Streaming callback. `done` is true on the final call. */
export type StreamUpdate = (acc: Acc, done?: boolean) => void;

export type ReasoningEffort = 'low' | 'medium' | 'high';
export type ReasoningFamily = 'effort' | 'budget';

export interface StreamChatOptions {
  model: string;
  messages: ChatMessage[];
  /** As produced by `buildReasoning`. */
  reasoning?: { effort?: ReasoningEffort } | { max_tokens?: number } | null;
  maxTokens?: number;
  temperature?: number;
  top_p?: number;
  response_format?: Record<string, any>;
  /** Merged into the request body last, after routing and tuning. */
  extra?: Record<string, any>;
  web?: boolean | Record<string, any>;
  /** Skip the semantic response cache for this call. */
  noCache?: boolean;
}

/** What `withFallback` takes — it supplies the model itself. */
export type StreamOptionsNoModel = Omit<StreamChatOptions, 'model'> & { model?: string };

export interface ReasoningRequest {
  /** `'auto'` resolves via `reasoningFamily(model)`. */
  mode?: 'auto' | ReasoningFamily;
  effort?: ReasoningEffort;
  /** Thinking-token budget, clamped 1024–128000. */
  budget?: number;
  /** Cut the model off shortly after it stops thinking. */
  cutoff?: boolean;
  /** Answer room in cutoff mode, clamped 1–4000. */
  cap?: number;
  /** Answer room in normal mode, clamped 256–200000. */
  room?: number;
}

export interface ReasoningPlan {
  reasoning: { effort?: ReasoningEffort } | { max_tokens: number } | null;
  /** Deliberately `undefined` for effort-family models. */
  maxTokens: number | undefined;
}

/* ── caching ── */

export interface CacheOrderedInput {
  /** Unchanging prefix pieces, joined with blank lines. Empty entries are dropped. */
  stable?: (string | null | undefined)[];
  /** Per-round messages, appended after the prefix and never inserted into it. */
  volatile?: ChatMessage[];
  model: string;
  noCache?: boolean;
}

export interface CacheStats {
  writes: number;
  reads: number;
  readTokens: number;
  writeTokens: number;
  promptTokens: number;
  /** Estimated dollars saved by cached reads. */
  saved: number;
  calls: number;
  /** Calls whose prefix was long enough and whose model was not local. */
  eligible: number;
}

export interface RCacheStats {
  hits: number;
  misses: number;
  saved: number;
  msSaved: number;
  /** Present once a lexical-similarity hit has occurred. */
  semanticHits?: number;
}

export interface RCacheEntry {
  content: string;
  cost: number;
  elapsed: number;
  usage: TokenUsage | null;
  model: string;
  ts: number;
  /** 3-shingles of the request, kept only when semantic caching is on. */
  shingles: Set<string> | null;
  /** Only on the copy returned by a similarity hit. */
  semantic?: boolean;
  similarity?: number;
}

/* ── office documents ── */

export type OfficeKind = 'docx' | 'xlsx' | 'pptx';

export interface DocxBlock {
  type: 'heading' | 'para' | 'bullet' | 'code' | (string & {});
  text: string;
  /** Heading depth; 1 and 2 render as h2, 3+ as h3. */
  level?: number;
}
export interface DocxDoc {
  title: string;
  blocks: DocxBlock[];
}

export interface XlsxSheet {
  name: string;
  /** Row 1 is the header row. Numerals are kept bare so they land as numbers. */
  rows: string[][];
}
export interface XlsxDoc {
  title: string;
  sheets: XlsxSheet[];
}

export interface PptxSlide {
  title: string;
  /** Short lines, not paragraphs. */
  bullets: string[];
}
export interface PptxDoc {
  title: string;
  slides: PptxSlide[];
}

export type OfficeDoc = DocxDoc | XlsxDoc | PptxDoc;

export interface OfficeKindSpec {
  label: string;
  ext: OfficeKind;
  build: (doc: any) => Blob;
  mime: string;
}

export interface OfficeRevision {
  doc: OfficeDoc;
  note: string;
  ts: number;
}

export interface OfficeState {
  kind: OfficeKind;
  doc: OfficeDoc | null;
  name: string;
  /** Capped at 12; a new push truncates the redo branch. */
  revs: OfficeRevision[];
  /** Index into `revs`, or -1. */
  rev: number;
  zoom: number;
  cost: number;
  busy: boolean;
}

export type OfficeGenerateResult =
  | { ok: true; blob: Blob; doc: OfficeDoc; ext: OfficeKind; cost: number; name: string }
  | { ok: false; error: string };

export type OfficeRefineResult =
  | { ok: true; doc: OfficeDoc; cost: number }
  | { ok: false; error: string };

/* ── long-horizon harness ── */

export interface ManifestFeature {
  id: string;
  title: string;
  /** What a human would DO to check it, in one sentence of observable behaviour. */
  criteria: string;
  /** 1 = build first. */
  priority: number;
  /** Starts false for every feature. Only `lhJudgeFeature` may set it true. */
  passes: boolean;
  attempts: number;
  lastNote: string;
}

export type LhProgressKind = 'init' | 'pass' | 'fail' | 'restore' | (string & {});

export interface LhProgressEntry {
  ts: string;
  kind: LhProgressKind;
  text: string;
}

export interface LhCheckpoint {
  id: string;
  ts: string;
  /** The feature id this checkpoint was taken after. */
  feature: string;
  title: string;
  files: Record<string, string>;
  entry: string;
  score: number;
}

export interface LongHorizonState {
  on: boolean;
  manifest: ManifestFeature[];
  progress: LhProgressEntry[];
  /** Persisted trimmed to the last 12. */
  checkpoints: LhCheckpoint[];
  featurePerRound: boolean;
  startupCheck: boolean;
  current: ManifestFeature | null;
}

export interface LhJudgement {
  feature: ManifestFeature;
  passed: boolean;
  /** Empty on a pass; otherwise the score and defect counts that blocked it. */
  note: string;
}

/** One relay round, as judged by `lhJudgeFeature`. */
export interface RelayRound {
  runtimeErrors?: any[];
  mobileFindings?: any[];
  regressions?: any[];
  verdict?: { score?: number; [k: string]: any };
  [k: string]: any;
}

/* ── connectors & MCP ── */

export type ConnectorKind = 'rest' | 'mcp-http' | 'mcp-stdio';

/** A tool as advertised by an MCP `tools/list`, or synthesised for GitHub. */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

export interface Connector {
  id: string;
  kind: ConnectorKind;
  label: string;
  /** For `mcp-http`. */
  url: string;
  /** For `mcp-stdio` — requires the local bridge. */
  cmd: string;
  token: string;
  on: boolean;
  tools: McpTool[];
  /** Human-readable, e.g. `connected · 6 tool(s) · graft`. */
  status: string;
  lastError: string;
  ts: string;
  serverInfo?: { name?: string; version?: string } | null;
}

export interface ConnectorConfig {
  label?: string;
  url?: string;
  cmd?: string;
  token?: string;
}

export type GithubToolName =
  | 'github_get_repo'
  | 'github_list_files'
  | 'github_read_file'
  | 'github_search_code'
  | 'github_list_issues';

export interface GithubReverseOptions {
  /** Output shape. Defaults to `'spec'`. */
  mode?: 'spec' | 'arch' | 'stack' | 'onboard';
  /** How many key files to read. Default 12, clamped 3–40. */
  maxFiles?: number;
}

export type GithubReverseResult =
  | {
      ok: true;
      /** The generated specification / map / brief. */
      prompt: string;
      meta: any;
      /** Number of top-level entries seen. */
      files: number;
      /** The paths actually read. */
      read: string[];
      cost: number;
      mode: string;
      modeLabel: string;
    }
  | { ok: false; error: string };

export interface ToolCallRequest {
  tool: string;
  args?: Record<string, any>;
}

export interface ToolCallOutcome {
  req: ToolCallRequest;
  result?: any;
  error?: string;
}

/* ── assistant routing ── */

export type AsstRouteKind = 'studio' | 'office' | 'reverse';

export interface AsstArtifact {
  kind: AsstRouteKind;
  /** How many files / blocks / sections were detected. */
  n: number;
  /** Short human-readable reason shown on the offer button. */
  note: string;
  /** Set for `'reverse'`: the `owner/repo` that was matched. */
  payload?: string;
}

/* ── models & providers ── */

export interface ModelPreset {
  id: string;
  name: string;
  /** Architect model id. Empty means "leave settings alone". */
  arch: string;
  /** Builder model id. Empty means "leave settings alone". */
  build: string;
  moaProps: string[];
  moaAgg: string;
  /** Clamped to 1–4 on apply. */
  moaLayers: number;
}

export interface ProviderModelMeta {
  context_length: number | null;
  max_completion_tokens: number | null;
  pricing: any;
  supported_parameters: string[] | null;
}

export interface Provider {
  id: string;
  label: string;
  /** OpenAI-compatible base URL, without a trailing slash. */
  base: string;
  key: string;
  on: boolean;
  /** Model ids returned by the last successful `/models` sync. */
  synced?: string[];
  syncedAt?: string | null;
  syncError?: string | null;
  /** Hand-typed model ids. */
  custom?: string[];
  meta?: Record<string, ProviderModelMeta>;
  /** True when the provider blocks browsers and must go through the bridge. */
  viaBridge?: boolean;
  [k: string]: any;
}

export type SyncResult =
  | { ok: true; count: number; route: 'direct' | 'bridge' }
  | { ok: false; why: string };

export type AddModelResult = { ok: true; full: string } | { ok: false; why: string };

/* ── functional voting ── */

export interface BehaviourProbe {
  findings: Array<{ id: string; sev?: string; msg?: string; [k: string]: any }>;
  errors: string[];
  rendered: boolean;
  /** Count of high-severity findings; 9 when the probe itself threw. */
  highs: number;
}

export interface VoteCandidate {
  /** Raw model output; parsed with `parseFiles`. */
  output: string;
  [k: string]: any;
}

export interface VoteCandidateResult {
  /** Index in the original candidate list. */
  i: number;
  c: VoteCandidate;
  key: string;
  probe: BehaviourProbe | null;
  files: Record<string, string>;
}

export interface VoteGroup {
  key: string;
  members: VoteCandidateResult[];
  n: number;
  highs: number;
  rendered: boolean;
}

export interface VoteResult {
  winner: VoteCandidateResult;
  /** Behaviour groups, best first. */
  groups: VoteGroup[];
  results: VoteCandidateResult[];
  /** Winning group size ÷ candidate count. */
  agreement: number;
  /** False when sample #1 would have won anyway. */
  changedOutcome: boolean;
}

/* ── golden traces & feedback ── */

export interface GoldenSpanSummary {
  name: string;
  kind: SpanKind;
  ms?: number;
  in: number;
  out: number;
  reasoning: number;
  parent: number | null;
  id: number;
}

export interface GoldenTrace {
  id: string;
  ts: string;
  name: string;
  notes: string;
  task: string;
  model: string;
  totals: SpanTotals;
  checks: ReasoningCheck;
  spans: GoldenSpanSummary[];
  score: number | null;
  files: string[];
}

export interface GoldenComparison {
  /** Fractional change vs the golden, e.g. `0.4` = 40% more expensive. */
  costDelta: number;
  tokenDelta: number;
  /** Absolute difference in call count. */
  callDelta: number;
  msDelta: number;
  reasoningShareThen: number;
  reasoningShareNow: number;
  /** Flags present now that the golden did not have. */
  newFlags: ReasoningFlag[];
  verdict: { state: 'better' | 'same' | 'worse'; why: string };
}

export interface FeedbackEntry {
  id: string;
  ts: string;
  good: boolean;
  note: string;
  tags: string[];
  task: string;
  model: string;
  totals: SpanTotals;
  /** Reasoning flag ids that were live when the grade was given. */
  flags: string[];
}

/* ── creations ── */

export type CreationType =
  | 'react_native'
  | 'android'
  | 'threejs_game'
  | 'html_webapp'
  | 'other'
  | (string & {});

export interface CreationInput {
  title?: string;
  type?: CreationType;
  files?: Record<string, string>;
  entry?: string;
  taskId?: string | null;
  score?: number | null;
  notes?: string;
}

export interface Creation {
  id: string;
  title: string;
  type: CreationType;
  entry: string;
  files: Record<string, string>;
  fileNames: string[];
  /** Total characters across all files. */
  bytes: number;
  ts: string;
  taskId: string | null;
  score: number | null;
  notes: string;
  shots: any[];
}

/* ── misc ── */

/** The localStorage wrapper, namespaced under `gb.`. Both calls swallow failures. */
export interface Store {
  get<T = any>(k: string, d?: T): T;
  set(k: string, v: any): boolean;
}

/** The Studio workspace. */
export interface Workspace {
  /** File name -> source text. */
  files: Record<string, string>;
  /** The file the preview loads. */
  entry: string;
  /** The file currently open in the editor. */
  active: string;
}

/** Persisted app settings. Unlisted keys are allowed. */
export interface GlassBoxSettings {
  base: string;
  title: string;
  referer: string;
  archModel: string;
  buildModel: string;
  guard: number;
  theme: string;
  ollama: string;
  ollamaAuto: boolean;
  bridge: string;
  bridgeAuto: boolean;
  [k: string]: any;
}

/* ═══════════════════ the API surface ═══════════════════ */

/**
 * Everything GlassBox publishes on `window.__gb`.
 *
 * Members are grouped by the region banners of the source file, in source order.
 * Regions marked (*) contain hand-verified signatures.
 */
export interface GlassBoxAPI {

  // ── core — helpers, settings and the model catalog (*) ──
  esc(s: any): any;

  /**
   * The localStorage wrapper every persisted value goes through, namespaced under
   * `gb.`. Both calls swallow failures — `set` returns false and toasts when storage is full.
   */
  store: Store;

  /**
   * Persisted app settings. Extra keys are allowed; the listed ones are the defaults
   * the app ships with and reads by name.
   */
  settings: GlassBoxSettings;
  readonly SESSION_SPEND: number;
  addSpend(c: any): any;
  PRESETS: any[];

  // ── PROVIDERS (*) ──

  /**
   * Every configured OpenAI-compatible provider. Read-only getter — mutate the
   * objects in place and call `saveProviders` / `rebuildProviderModels` rather than reassigning.
   */
  readonly PROVIDERS: Provider[];
  providerFor(model: any): any;
  rebuildProviderModels(): any;

  /**
   * List a provider's models from `{base}/models`, direct first and through
   * the local bridge on failure. Accepts both `{data:[…]}` and a bare array, and both string and
   * object rows. Populates `p.synced`, `p.syncedAt` and per-model `p.meta` (context length, max
   * completion tokens, pricing, supported parameters), then rebuilds the catalog. Never throws —
   * a failure sets `p.syncError` and returns `{ok:false}`.
   * @param opts `quiet` suppresses the toast.
   */
  syncProviderModels(p: Provider, opts?: { quiet?: boolean }): Promise<SyncResult>;

  /**
   * Sync every enabled provider that has a key, in parallel, quietly.
   * Individual failures are captured rather than rejecting the whole batch.
   */
  syncAllProviders(opts?: any): Promise<Array<{ provider: string } & SyncResult>>;

  /**
   * Hand-type a model id — the escape hatch for anything a provider does not
   * list, such as a coding-plan-only id or a model released an hour ago. Deduplicated.
   * @returns `{ok:true, full:'provider/model'}`, or `{ok:false, why}` for an unknown provider or empty id.
   */
  addCustomModel(providerId: string, modelId: string): AddModelResult;

  /**
   * Drop a hand-typed model id and rebuild the catalog. False if the provider is unknown.
   */
  removeCustomModel(providerId: string, modelId: string): boolean;
  routeFor(model: any): any;
  ollamaCandidates(): any;
  probeOllama(base: any, ms: any): Promise<any>;
  syncOllama(silent: any): Promise<any>;
  showOriginBanner(): any;
  opaqueOrigin(): any;
  renderOllamaHelp(results: any): any;
  canReason(id: any): any;
  maxOut(id: any): any;

  /**
   * Which reasoning-parameter dialect a model id speaks. `openai` and
   * `x-ai` take an effort level; everyone else takes a token budget.
   */
  reasoningFamily(id: string): ReasoningFamily;

  // ── REASONING OPS (*) ──

  /**
   * The ops / feature-flag bag — `rcache`, `semanticCache`, `semanticThreshold`,
   * `fallback` and friends. Read-only getter; use {@link GlassBoxAPI.setOPS} to replace it.
   */
  readonly OPS: Record<string, any>;
  capTokens(cap: any, model: any): any;
  autoVerbosity(cap: any, model: any): any;
  effortForCap(t: any): any;
  advisorCall(adv: any, overrideCap: any): any;
  advisorFires(adv: any, round: any): any;
  advisorsFor(role: any, round: any): any;
  advisorSys(adv: any, plan: any, extra: any): any;

  // ── SKILLS (Claude-Code style .md) (*) ──

  /**
   * Loaded Claude-Code-style `.md` skills.
   */
  readonly SKILLS: any[];
  parseSkillMd(text: any, fallbackName: any): any;

  // ── MISSION CONTROL ──
  LOG: any[];
  readonly HEALTH: Record<string, any>;
  logEvent(kind: any, data: any): any;
  healthOf(p: any): any;

  // ── MISSION CONTROL › Sessions ──
  SESSIONS: any[];
  SESSION_SOURCES: Record<string, any>;
  upsertSession(s: any): any;
  refreshSessions(): Promise<any>;

  // ── MISSION CONTROL › Comms bus ──
  COMMS: any[];
  comm(from: any, to: any, body: any, kind: any): any;
  interject(text: any, target: any): any;

  // ── MISSION CONTROL › Escalation & delegation (*) ──
  ESCALATION_DEFAULTS: Record<string, any>;
  escalateAsk(question: any, cfg: any, hostEl: any): Promise<any>;

  /**
   * Bucket a token count into an effort level: ≤1500 low, ≤6000 medium, else high.
   */
  effortForTokens(n: number): ReasoningEffort;
  ESCALATION_HINT(): any;
  handleAsks(text: any, hostEl: any): Promise<any>;
  tokensFor(model: any, dollars: any): any;

  // ── MISSION CONTROL › Standup ──
  runStandup(members: any, context: any, hostEl: any): Promise<any>;

  // ── COST PER COMPLETED TASK ──
  PROJECT_TYPES: Record<string, any>;
  TASKS: any[];
  taskStart(title: any, type: any, cfg: any): any;
  taskRecordRound(t: any, opts: { cost?: any; usage?: any; model?: any; score?: any }): any;
  taskClose(t: any, satisfied: any, notes: any): any;
  cpctStats(filter: any): any;
  cpctTrend(window: any): any;
  cpctByKey(keyFn: any): any;

  // ── CONNECTORS & MCP (*) ──

  /**
   * The connector types offered in the UI, each with its transport kind and
   * an honest note about what it needs (several `mcp-stdio` entries require the local bridge).
   */
  CONNECTOR_PRESETS: Array<{ id: string; label: string; kind: ConnectorKind; icon: string; hint: string; authLabel: string; cmd?: string }>;

  /**
   * Every configured connector, persisted to localStorage.
   */
  CONNECTORS: Connector[];

  /**
   * Register a new connector from a preset id. Starts enabled, with no tools and
   * status `'never connected'`.
   */
  connectorAdd(preset: ConnectorKind | string, cfg: ConnectorConfig): Connector;

  /**
   * One JSON-RPC 2.0 round trip over whichever transport the connector uses.
   * `mcp-stdio` requires the local bridge (a browser cannot spawn a process). `mcp-http` is
   * tried directly first and retried through the bridge on failure, and understands both plain
   * JSON and SSE-framed replies (taking the last `data:` line).
   * @throws With the JSON-RPC error message, or a plain-language explanation when the bridge is
   * missing, too old, or the server returned a non-JSON body / an SSE reply with no data frame.
   */
  mcpRpc(c: Connector, method: string, params?: Record<string, any>): Promise<any>;

  /**
   * Probe or handshake a connector and populate `c.tools` **in place**.
   * REST/GitHub is probed against `/rate_limit` so "connected" means something; MCP servers get
   * `initialize` then `tools/list`. Never throws — failures land in `c.status` and `c.lastError`.
   * @returns The same connector object, mutated and persisted.
   */
  connectorConnect(c: Connector): Promise<Connector>;

  /**
   * Invoke one tool on a connector inside a `'tool'` span. REST connectors go
   * through {@link GlassBoxAPI.githubCall}; MCP connectors get `tools/call`.
   * @throws Re-throws the underlying failure after recording it on the span and the event log.
   */
  connectorCall(c: Connector, tool: string, args?: Record<string, any>): Promise<any>;

  /**
   * The GitHub tool surface exposed to models — read-heavy by design, with no
   * destructive operations.
   */
  GITHUB_TOOLS: Array<{ name: GithubToolName; description: string; schema: Record<string, any> }>;

  /**
   * The direct GitHub REST surface — read-only by design, no destructive operations
   * exposed. Recognises `github_get_repo`, `github_list_files`, `github_read_file` (base64
   * decoded), `github_search_code` and `github_list_issues`.
   * @throws `unknown tool` for anything else; HTTP errors are annotated for 403 (rate limit,
   * add a token) and 404 (missing, or private and invisible to this token).
   */
  githubCall(c: Pick<Connector, 'token'> & Partial<Connector>, tool: GithubToolName | (string & {}), a: Record<string, any>): Promise<any>;

  /**
   * The system-prompt block telling a builder which tools exist and the exact
   * `===USE TOOL===` / `===END===` envelope to request one. Returns `''` when no enabled
   * connector has tools. Lists at most 14 tools per connector.
   */
  connectorBlock(): string;

  /**
   * Scan model output for `===USE TOOL===` blocks and execute them, at most 8
   * per response. Unparseable blocks are skipped silently; a tool no connector provides yields
   * an `error` entry rather than throwing.
   * @returns `null` when nothing ran (no enabled connectors, no text, or no valid blocks).
   */
  handleToolCalls(text: string, hostEl?: HTMLElement | null): Promise<ToolCallOutcome[] | null>;

  // ── RUN TREE (*) ──

  /**
   * Every span recorded this session, in creation order (flat, not nested).
   */
  SPANS: Span[];

  /**
   * Open a span and push it on the active stack, so the next span opened becomes
   * its child. Every model call in the app goes through this, which is what makes a run a
   * tree rather than a flat log.
   * @param name Label shown in the run tree — usually the model id or a step name.
   * @param kind Defaults to `'llm'`. `'tool'` is used for connector calls.
   * @param meta Free-form annotations (`{model}`, `{connector,tool}`, `{fallbackFrom}` …).
   * @returns The live span object — pass it back to {@link GlassBoxAPI.spanEnd}.
   */
  spanStart(name: string, kind?: SpanKind, meta?: Record<string, any>): Span;

  /**
   * Close a span, stamp its duration, and fold in the token/cost/reasoning totals
   * from an accumulator. Pops the span off the active stack. Safe to call with a null span.
   * @param s The span returned by {@link GlassBoxAPI.spanStart}.
   * @param acc Completion accumulator; its `usage`, `cost`, `content` and reasoning are copied in.
   * @param err If set, `span.error` becomes `String(err.message || err)`.
   */
  spanEnd(s: Span | null | undefined, acc?: Acc | null, err?: Error | string | null): Span | undefined;

  /**
   * Rebuild SPANS into a forest by linking each span to its parent.
   * Returns *copies* — mutating the result does not affect `SPANS`.
   */
  spanTree(): Span[];

  /**
   * Aggregate every span in `SPANS`. `answerTokens` is output minus reasoning
   * tokens, and `reasoningShare` is reasoning ÷ output — the number that tells you a model
   * thought itself out of an answer.
   */
  spanTotals(): SpanTotals;

  // ── FAILING-REASONING HEURISTICS (*) ──

  /**
   * Word n-grams of `text` as a Set. Lowercased, non-alphanumerics collapsed to
   * spaces. Used at n=5 for circular-reasoning detection and n=3 for the semantic response cache.
   */
  shingles(text: string, n: number): Set<string>;

  /**
   * |A ∩ B| / |A ∪ B|. Returns 0 if either set is empty.
   */
  jaccard(a: Set<string>, b: Set<string>): number;

  /**
   * Local, model-free heuristics over the `'llm'` spans of a trace. Detects
   * circular reasoning (≥62% 5-shingle Jaccard between two steps with >200 chars of text),
   * empty steps, all-thought-no-answer, sudden context drops, runaway call depth (>8), and
   * error cascades (≥3 failures). Each flag explains *why* rather than only raising.
   * @param spans Defaults to the global `SPANS`.
   * @returns `ok` is false when any flag has severity `'high'`.
   */
  checkReasoning(spans?: Span[]): ReasoningCheck;

  // ── FALLBACK ROUTING (*) ──

  /**
   * Defaults for fallback routing, overlaid by `OPS.fallback`. A response
   * shorter than `minChars` counts as a failure when `onEmpty` is set.
   */
  FALLBACK_DEFAULTS: { on: boolean; to: string; minChars: number; onEmpty: boolean };

  /**
   * Run `primaryModel`, and if it throws or returns less than `minChars`
   * (default 120) of content, hand the partial reasoning to the fallback model to finish.
   * The handoff is recorded as its own span with `meta.fallbackFrom`, so the result is never
   * silently attributed to the model that failed; the returned accumulator carries `fellBackFrom`.
   * Falls back to `settings.buildModel` when `OPS.fallback.to` is unset.
   */
  withFallback(primaryModel: string, opts: StreamOptionsNoModel, onUpdate?: StreamUpdate | null, signal?: AbortSignal | null, label?: string): Promise<Acc>;

  // ── GOLDEN TRACES & FEEDBACK (*) ──

  /**
   * Saved golden traces, newest first.
   */
  GOLDENS: GoldenTrace[];

  /**
   * Freeze the current run — totals, reasoning checks, a slimmed span list, the
   * relay score and the workspace file names — as a golden to measure later runs against.
   * Newest first; the store keeps the last 40.
   */
  saveGoldenTrace(name?: string, notes?: string): GoldenTrace;

  /**
   * Compare the current run against a golden. Regressions in **cost and shape**
   * count as much as regressions in output. The verdict is `'worse'` on any new high-severity
   * reasoning flag or >40% cost increase, `'better'` at >20% cheaper with no new flags,
   * otherwise `'same'`. Returns null for a missing golden.
   */
  compareToGolden(g: GoldenTrace | null | undefined): GoldenComparison | null;

  /**
   * Hand-graded runs, newest first.
   */
  FEEDBACK: FeedbackEntry[];

  /**
   * Record a thumbs up/down on the current run, with the totals and flag ids that
   * were live at the time. The store keeps the last 200.
   */
  gradeTrace(good: boolean, note?: string, tags?: string[]): FeedbackEntry;

  /**
   * Turn graded runs into standing prompt instructions — up to 6 thumbs-down and
   * 3 thumbs-up notes, framed as things this user has already told us. Returns `''` when no
   * graded run carries a note. (`limit` is accepted but not currently read.)
   */
  feedbackBlock(limit?: number): string;

  // ── LONG-HORIZON HARNESS (*) ──

  /**
   * The standing rules about the feature manifest, appended to every
   * long-horizon brief: only `passes` may change, nothing may be deleted or weakened, and
   * `passes:true` requires end-to-end verification.
   */
  MANIFEST_RULES: string;

  /**
   * Long-horizon harness state: the immutable feature manifest, the progress log and the
   * per-feature checkpoints.
   */
  LH: LongHorizonState;

  /**
   * Expand a one-line request into an explicit, verifiable feature list via a
   * schema-constrained model call, then install it as `LH.manifest` sorted by priority with
   * **every feature failing** — "done" has to be earned, never assumed.
   * @param hostEl Optional element that receives streaming progress text.
   * @returns The new manifest, or `null` if the model did not return usable JSON.
   */
  buildManifest(task: string, model?: string, hostEl?: HTMLElement | null): Promise<ManifestFeature[] | null>;

  /**
   * The first feature in the manifest that is not passing, or null.
   */
  nextFeature(): ManifestFeature | null;

  /**
   * True when every feature passes. Note: returns `0` (not `false`) when the
   * manifest is empty, because the implementation short-circuits on `.length`.
   */
  manifestDone(): boolean;

  /**
   * Append to the append-only progress log that bridges context windows.
   * Text is truncated to 400 chars; the log is capped at 200 entries.
   */
  lhProgress(kind: LhProgressKind, text: string): void;

  /**
   * The system-prompt block a fresh session is given: progress so far, recent history,
   * features already passing, the single feature to work on this round, and `MANIFEST_RULES`.
   * Returns `''` when long-horizon mode is off or the manifest is empty.
   */
  lhBrief(): string;

  /**
   * The harness — never the model — decides whether a feature passed. Requires
   * zero runtime errors, zero regressions, zero mobile findings and a verdict score ≥ 80.
   * Increments `attempts`, writes `lastNote`, appends to the progress log, and on a pass pushes
   * a restorable checkpoint of the whole workspace.
   */
  lhJudgeFeature(round: RelayRound): LhJudgement | null;

  /**
   * Roll the Studio workspace back to a checkpoint. Returns false if the id is unknown.
   */
  lhRestore(cpId: string): boolean;

  // ── FUNCTIONAL VOTING (*) ──

  /**
   * Collapse a probe into a comparable behaviour signature —
   * `rendered / sorted finding ids / digit-normalised errors`. Two candidates that *do* the same
   * thing share a key even when their code differs. Returns `'no-response'` for a null probe.
   */
  behaviourKey(probe: BehaviourProbe | null | undefined): string;

  /**
   * Best-of-N decided by what the code **does**, not by what it looks like.
   * Each candidate's files are loaded into the workspace, actually run on a device profile, and
   * grouped by {@link GlassBoxAPI.behaviourKey}; groups are ranked by rendered-ness, then size,
   * then fewest high-severity defects. The workspace is restored after each probe.
   * @param dev Defaults to the `iphone-15` device profile.
   * @param settleMs Defaults to 1500.
   * @returns `changedOutcome` tells you whether voting beat simply taking sample #1.
   */
  voteFunctionally(candidates: VoteCandidate[], dev?: any, settleMs?: number): Promise<VoteResult>;

  // ── CONTEXT COMPACTION ──
  compactContext(text: any, opts?: { keepHead?: any; keepTail?: any; maxTotal?: any }): any;

  // ── EFFECTIVE FEEDBACK ──
  feedbackScore(round: any): any;

  // ── ERROR TAXONOMY ──
  ERROR_CLASSES: any[];
  classifyErrors(errors: any): any;
  repairGuidance(errors: any): any;

  // ── CPCT-DRIVEN ROUTING ──
  routeByCPCT(projType: any, candidates: any): any;

  // ── BUDGET GUARDIAN ──
  GUARD_DEFAULTS: Record<string, any>;
  GUARD_STATE: Record<string, any>;
  costGuardCheck(cost: any, ctxChars: any): any;

  // ── A/B HARNESS EXPERIMENTS ──
  EXPERIMENTS: any[];
  expStart(name: any, task: any, variants: any): any;
  expRecord(e: any, idx: any, opts: { spend?: any; rounds?: any; score?: any; tokens?: any }): any;
  expVerdict(e: any): any;

  // ── RUN REPLAY ──
  replayFrames(run: any): any;

  // ── THE BRAIN ──
  IDB: Record<string, any>;
  BRAIN: Record<string, any>;
  brainCapable(): any;
  brainLoad(): Promise<any>;
  brainSlug(name: any): any;
  brainAdd(opts: { name?: any; body?: any; kind?: any; tags?: any; source?: any; on?: any }): Promise<any>;
  brainFlush(docs: any): Promise<any>;
  brainDocText(d: any): any;
  brainZip(): any;
  brainBullets(doc: any): any;
  scoreBullet(b: any, taskWords: any): any;
  brainBlock(limit: any, task: any, agent: any): any;
  readonly CTX: Record<string, any>;
  noteContext(label: any, messages: any): any;

  // ── THE BRAIN MAP ──
  brainGraph(): any;
  layoutGraph(g: any, iters: any): any;
  readonly MAP3D: Record<string, any>;
  stopMap(): any;
  renderBrainMap(force: any): Promise<any>;
  brainWrite(model: any, title: any, raw: any, kind: any): Promise<any>;
  skillsBlock(limit: any): any;

  // ── SEEDED AGENT SKILLS ──
  SEED_SKILLS_5: any[];

  // ── PROMPT LIBRARY (*) ──

  /**
   * The prompt library, or null before it is first seeded.
   */
  readonly PROMPTS: any;
  fillPrompt(body: any, project: any): any;

  // ── FABLE-MODE STAGE CHECKS ──
  stageCheck(output: any, files: any, verdict: any, runtimeErrors: any): any;

  // ── VISION: see what the builder cannot ──
  capturePreview(ms: any): any;

  // ── DEVICE LAB ──
  DEVICES: any[];
  askFrame(frame: any, ask: any, extra: any, ms: any): any;
  testOnDevice(dev: any, settleMs: any): Promise<any>;
  runDeviceSweep(devIds: any, onProgress: any): Promise<any>;
  sweepToFixes(results: any): any;

  // ── PERF BUDGET ──
  perfViolations(stats: any, budget: any): any;

  // ── REGRESSION GUARD ──
  readonly GOLDEN: any;
  captureGolden(results: any, files: any): any;
  regressionsVs(results: any): any;
  visionCapable(id: any): any;

  // ── CLAUDE CODE / CODEX BRIDGE ──
  isBridge(m: any): any;
  readonly BRIDGE_TOKEN: any;
  readonly BRIDGE_INFO: any;
  probeBridge(silent: any): Promise<any>;

  // ── HANDOFF — GlassBox as a waypoint ──
  handoffDocs(): any;
  handoffBundle(): any;
  handoffPrompt(): any;
  crc32(u8: any): any;
  makeZip(files: any): any;
  bridgePost(pathname: any, body: any): Promise<any>;

  // ── COST FORECAST (*) ──
  forecastRun(maxRounds: any): any;
  CATALOG_DEAD_FIELDS: any[];
  catalogSlim(list: any): any;

  /**
   * Turn UI reasoning controls into the provider-specific request fields.
   * Non-reasoning models get `reasoning:null` and a plain token room (8192 for local models in
   * cutoff mode, since they emit `<think>` inline). `'effort'` families (openai, x-ai) get
   * `{effort}` and **no** `max_tokens`, because a cap there is spent on thinking first.
   * `'budget'` families get `{max_tokens: budget}` plus a strictly larger `maxTokens`; if the
   * model's own ceiling would violate that, the thinking budget is shrunk rather than emitting
   * an invalid request.
   */
  buildReasoning(opts: ReasoningRequest, model: string): ReasoningPlan;
  accInit(): any;
  applyDelta(acc: any, delta: any): any;
  detailsArray(acc: any): any;
  splitThinkTags(acc: any): any;

  // ── WORKER OFFLOAD ──
  readonly WORKER_STATS: Record<string, any>;
  getWorker(): any;
  workerDo(op: any, payload: any, inlineFallback: any): any;

  // ── OPFS STORAGE TIER ──
  OPFS: Record<string, any>;

  // ── PROMPT CACHING (*) ──

  /**
   * Providers that cache prompts automatically — no breakpoint needed.
   */
  CACHE_AUTO: RegExp;

  /**
   * Providers that need an explicit `cache_control` breakpoint.
   */
  CACHE_EXPLICIT: RegExp;

  /**
   * ~1k tokens — the lowest prefix length any provider will cache. Below this,
   * caching is skipped entirely.
   */
  CACHE_MIN_CHARS: number;

  /**
   * Running provider-cache counters for this session. Read-only getter.
   */
  readonly CACHE_STATS: CacheStats;

  /**
   * Build a message array whose unchanging part is one contiguous prefix,
   * so a provider prompt cache can match on it. Stable strings are joined with blank lines into
   * the system message; volatile messages are appended after it and never inserted into it.
   * Providers matching `CACHE_EXPLICIT` get Anthropic-style content blocks with a 1h ephemeral
   * `cache_control` breakpoint; everyone else gets a plain string. Caching is skipped below
   * `CACHE_MIN_CHARS` (4200) and for local models.
   */
  cacheOrderedMessages(input: CacheOrderedInput): ChatMessage[];

  /**
   * Read back what the provider *actually* did from
   * `usage.prompt_tokens_details` and fold it into `CACHE_STATS`. Claims about caching are
   * worthless without this.
   */
  recordCacheUsage(acc: Acc | null | undefined, model: string): void;

  /**
   * Cached prompt tokens ÷ total prompt tokens, 0 when nothing has been sent.
   */
  cacheHitRate(): number;

  // ── SEMANTIC RESPONSE CACHE (*) ──

  /**
   * The LRU response cache itself, keyed by {@link GlassBoxAPI.rcacheKey}. Read-only getter.
   */
  readonly RCACHE: Map<string, RCacheEntry>;

  /**
   * Hit/miss and savings counters for the response cache. Read-only getter.
   */
  readonly RCACHE_STATS: RCacheStats;

  /**
   * Deterministic key for the semantic response cache: a djb2-xor hash of
   * `model | JSON(messages) | JSON(extra)`, suffixed with the source length as a collision guard.
   */
  rcacheKey(model: string, messages: ChatMessage[], extra?: Record<string, any>): string;

  /**
   * Exact-match lookup first (free and certain, and re-inserts for LRU). Then, when
   * `OPS.semanticCache` is on, a lexical similarity pass over entries **of the same model**
   * using 3-shingle Jaccard against `OPS.semanticThreshold` (clamped to 0.75–0.99). Prompts
   * under 60 chars or 12 shingles are never matched. A semantic hit is returned as a copy with
   * `semantic:true` and `similarity`.
   */
  rcacheGet(k: string, model: string, messages?: ChatMessage[] | null): RCacheEntry | null;

  /**
   * Store a completion under `k`. Ignores responses shorter than 40 characters.
   * Evicts oldest-first at a 60-entry cap.
   */
  rcachePut(k: string, acc: Acc | null | undefined, model: string, messages?: ChatMessage[] | null): void;

  // ── WEB ACCESS (*) ──
  WEB_ENGINES: any[];
  AUTHORITY_DOMAINS: string[];
  WEB: Record<string, any>;
  webNativeCapable(id: any): any;
  webParams(model: any, cfg: any): any;
  splitDomains(s: any): any;
  webCostEst(model: any, cfg: any): any;
  citationsOf(acc: any): any;

  /**
   * The single transport for every model call. Routes to OpenRouter, a configured
   * provider, a local Ollama runtime, or through the local bridge for providers that block
   * browsers; consults the response cache; streams SSE deltas into an accumulator.
   * @param onUpdate Called on each delta with the live accumulator; the second argument is
   * `true` on the final call.
   * @param signal Abort signal.
   * @throws If no API key is set for a non-local route, or on a non-2xx HTTP response.
   */
  streamChat(opts: StreamChatOptions, onUpdate?: StreamUpdate | null, signal?: AbortSignal | null): Promise<Acc>;
  mergeAcc(base: any, cont: any, prefix: any): any;

  /**
   * {@link GlassBoxAPI.streamChat} wrapped in the behaviour every caller wants:
   * a span is opened and closed around it, a degenerating local model is resampled **once** at
   * different sampling settings, and a response that stopped on `finishReason === 'length'` is
   * auto-continued up to `MAX_CONTINUES` times with the partial text stitched back together.
   * @param label Span label; defaults to the model id.
   */
  streamComplete(opts: StreamChatOptions, onUpdate?: StreamUpdate | null, signal?: AbortSignal | null, label?: string): Promise<Acc>;
  estCost(acc: any, model: any): any;
  analyzeThought(txt: any): any;
  extractJSON(s: any): any;

  /**
   * The Studio workspace: the files, the preview entry point and the file being edited.
   * Read-only getter, but the object itself is mutated in place throughout the app.
   */
  readonly WS: Workspace;

  /**
   * Errors captured from the Studio preview iframe since the last run.
   */
  readonly previewErrors: any[];
  renameFile(old: any): any;
  composePreview(withShim?: any): any;
  runPreview(): any;
  parseFiles(text: any): any;
  applyToStudio(text: any): any;
  readonly ACTIVE_TASK: any;

  /**
   * Live relay state, or null when no relay is running.
   */
  readonly RS: any;
  architectSys(studio: any, evolve: any): any;
  extractSection(text: any, name: any): any;

  // ── SELF-EDIT ──
  SELF: Record<string, any>;
  selfCapable(): any;
  selfLoadSource(): Promise<any>;
  selfThumb(): Promise<any>;
  selfSnapshot(label: any, source: any): Promise<any>;
  selfValidate(src: any): any;
  selfPreview(src: any): any;
  selfApply(src: any, label: any): Promise<any>;

  // ── CREATIONS (*) ──

  /**
   * Everything the app has built, newest first.
   */
  CREATIONS: Creation[];

  /**
   * File a built artifact by what it actually is. The store keeps the last 200.
   */
  creationSave(input: CreationInput): Creation;

  /**
   * Sniff the creation type from file names and content — React Native, Android,
   * a three.js game, a plain HTML web app, or `'other'`. An explicit `taskType` other than
   * `'other'` always wins. The type is not cosmetic: it selects builder steering, which gates
   * run, and how the thing is exported.
   */
  creationTypeOf(files: Record<string, string>, taskType?: string): CreationType;
  typeSteer(type: any): any;

  // ── LOOP UNTIL PERFECT ──
  LOOP_DEFAULTS: Record<string, any>;
  loopVerdict(state: any): any;

  // ── RECON ──
  RECON_TRIGGERS: RegExp;
  scoreFinding(f: any, ask: any, nowMs: any): any;
  runRecon(ask: any, cfg: any, hostEl: any): Promise<any>;
  reconBrief(r: any): any;

  // ── RESEARCH → SELF-PATCH ──
  RESEARCH_SOURCES: Record<string, any>;
  RESEARCH_TOPICS: any[];
  sourceIndex(src: any): any;
  sourceRegions(src: any): any;
  parsePatches(text: any): any;
  applyPatches(src: any, patches: any): any;
  runResearch(topic: any, cfg: any, hostEl: any): Promise<any>;
  proposeSelfPatch(src: any, goal: any, research: any, model: any, hostEl: any): Promise<any>;

  // ── SWARM ──
  runSwarm(rn: any, baseFiles: any): Promise<any>;
  builderMessage(prevOut: any, prevFixes: any, errors: any, patchMode: any): any;
  diffHTML(a: any, b: any): any;

  // ── BRAIN — LIFECYCLE, AGENTS, MISTAKES ──
  BRAIN_AGENTS: Record<string, any>;
  BRAIN_STATUS: Record<string, any>;
  brainLive(): any;
  brainForAgent(d: any, agent: any): any;
  brainWithRefs(doc: any, depth: any): any;
  brainMistakeBlock(max: any): any;
  brainMistake(opts: { name?: any; body?: any; severity?: any; tags?: any; agents?: any }): Promise<any>;
  brainSetStatus(id: any, status: any): Promise<any>;
  brainSetExpiry(id: any, ms: any): Promise<any>;
  brainSetAgents(id: any, agents: any): Promise<any>;
  brainSetRefs(id: any, refs: any): Promise<any>;

  // ── BRAIN CURATOR ──
  CURATE_SCHEMA: Record<string, any>;
  CURATION: any;
  brainCurate(model: any, hostEl: any): Promise<any>;
  brainApplyCuration(): Promise<any>;
  brainSpawnFromPlan(onUpdate: any): Promise<any>;

  // ── DREAMING ──
  DREAM_DEFAULTS: Record<string, any>;
  DREAM: Record<string, any>;
  DREAM_TREE: any;
  DREAM_SOURCES: any[];
  dreamRecent(): any;
  dreamRun(manual: any): Promise<any>;
  dreamSchedule(): any;

  // ── RESEARCH SESSIONS ──
  RSESSIONS: any[];
  rsessSave(query: any, findings: any, meta: any): any;
  rsessToBrain(sessionId: any, indices: any): Promise<any>;

  // ── CAPABILITY TIERS — memory sized to the model ──
  MODEL_TIERS: Record<string, any>;
  TIER_RULES: any[];
  TIER_OVERRIDE: Record<string, any>;
  modelTier(model: any): any;

  // ── PER-MODEL TRACKS ──
  MODEL_TRACKS: any[];
  readonly TRACK_STATE: Record<string, any>;
  tracksFor(model: any): any;
  trackObserve(model: any, text: any): any;
  trackBlock(model: any): any;

  // ── SNIPPETS IN THE GRAPH ──
  snippetAdd(gid: any, opts: { label?: any; lang?: any; code?: any; note?: any; verified?: any }): any;
  snippetBlock(gid: any, task: any, limit: any, opts?: { fallback?: any }): any;

  // ── LONG-HORIZON LOOPS ──
  LOOP_KINDS: Record<string, any>;
  LOOPS: any[];
  loopCreate(name: any, kind: any, objective: any): any;
  loopBrief(loopId: any, model: any): any;
  loopAdvance(loopId: any, opts: { note?: any; passed?: any; nodeIds?: any }): any;

  // ── MEMORY ASSEMBLY — the one place it all comes together ──
  resolveContradictions(gid: any, nodes: any): any;
  memoryFor(model: any, task: any, opts?: { loopId?: any; graphId?: any; budget?: any }): any;

  // ── MEMORY ASSEMBLY — the one place it all comes together › Cache-stable split ──
  memoryParts(model: any, task: any, opts?: { loopId?: any; graphId?: any; budget?: any; temporal?: any }): any;
  memoryMessages(model: any, task: any, opts?: { loopId?: any; graphId?: any; budget?: any; system?: any; noCache?: any; temporal?: any }): any;
  readonly MEMORY_LAST: any;
  memoryEffect(model: any, task: any, graphId: any): Promise<any>;

  // ── TEMPORAL AWARENESS ──
  TEMPORAL: Record<string, any>;
  saveTemporal(): any;
  fmtDur(ms: any): any;
  temporalFacts(o: any): any;
  temporalBrief(o: any): any;

  // ── UNIVERSAL 3D VISUALIZER ──
  VIZ_SOURCES: Record<string, any>;
  VIZ_COLOR: Record<string, any>;
  vizColor(k: any): any;
  vizBuild(source: any): any;
  readonly VIZ: Record<string, any>;
  vizRender(hostSel: any, source: any): Promise<any>;
  vizStats(): any;

  // ── ACTIVE PROCESS HIGHLIGHTING ──
  readonly ACTIVE: Map<any, any>;
  activeMark(kind: any, label: any): any;
  activeList(): any;
  renderActiveBar(): any;
  activeInit(): any;

  // ── KNOWLEDGE CHATBOT ──
  knowledgeSnapshot(): any;
  KCHAT: any[];
  knowledgeAsk(question: any, model: any): Promise<any>;

  // ── PROGRESSIVE COMPACTION ──
  COMPACT_STAGES: any[];
  msgChars(ms: any): any;
  compactBudget(ms: any): any;
  compactSnip(ms: any, maxBlock: any): any;
  compactMicro(ms: any, keepRecent: any): any;
  compactCollapse(ms: any, keepRecent: any): any;
  compactLadder(messages: any, model: any, opts: any): Promise<any>;

  // ── HARNESS DEFECT DIAGNOSTICS ──
  DEFECT_CLASSES: Record<string, any>;
  detectDrift(messages: any, opts: any): any;
  SCHEMA_MEMORY: Record<string, any>;
  shapeOf(v: any): any;
  detectSchema(toolName: any, result: any, opts: any): any;
  detectState(): any;
  harnessDiagnose(messages: any, opts: any): any;

  // ── GHOSTTY ──
  GHOSTTY_INVALID: Record<string, any>;
  GHOSTTY_VALID: any[];
  ghosttyValidate(text: any): any;
  ghosttyConfig(o: any): any;
  GHOSTTY_INSTALL: Record<string, any>;

  // ── ONE-CLICK CONNECT ──
  platformGuess(): any;
  probeParallel(urls: any, path: any, validate: any, timeoutMs: any): Promise<any>;
  connectBridgeOneClick(): Promise<any>;
  bridgeLauncher(platform: any): any;
  downloadLauncher(platform: any): any;
  bridgeAutostart(enable: any): Promise<any>;
  scanLocalRuntimes(): Promise<any>;
  readonly LOCAL_EXTRA_MODELS: any[];

  // ── AGENTIC SURFACE + SUGGESTIONS ──
  SUGGEST_DEFAULTS: Record<string, any>;
  SUGGEST: Record<string, any>;
  saveSuggest(): any;
  suggestOn(surface: any): any;
  agentSuggestions(): any;
  agentState(): any;

  // ── LOCAL RUNTIMES ──
  LOCAL_RUNTIMES: Record<string, any>;
  LOCALCFG_DEFAULTS: Record<string, any>;
  LOCALCFG: Record<string, any>;
  saveLocalCfg(): any;
  runtimeOf(model: any): any;
  localBase(id: any): any;
  SAMPLING_PROFILES: Record<string, any>;
  localTune(runtime: any, body: any, explicit: any): any;
  readonly LOCAL_CTX: Record<string, any>;
  saveLocalCtx(): any;
  ollamaDeclaredCtx(name: any): Promise<any>;
  truncationProbe(model: any, approxTokens: any): Promise<any>;
  measureContext(model: any, onStep: any): Promise<any>;

  // ── DEGENERATION GUARD ──
  LOOPSCAN_DEFAULTS: Record<string, any>;
  loopScan(text: any, opt: any): any;
  loopIntervention(scan: any, runtime: any, body: any): any;
  stallCheck(lastTokenAt: any, now: any, seconds: any): any;

  // ── PREFLIGHT ──
  preflight(model: any, messages: any, opts: any): any;

  // ── LOCAL BENCH ──
  readonly LOCAL_BENCH: Record<string, any>;
  benchModel(model: any, onStep: any): Promise<any>;

  // ── DESIGN STUDIO — COLOUR ENGINE ──
  DESIGN_DEFAULTS: Record<string, any>;
  DESIGN: Record<string, any>;
  saveDesign(): any;
  hexToRgb(hex: any): any;
  rgbToHex(c: any): any;
  hexToOklch(hex: any): any;
  oklch(l: any, c: any, h: any): any;
  oklchStr(hex: any): any;
  relLum(hex: any): any;
  contrastRatio(a: any, b: any): any;
  contrastGrade(r: any): any;
  tonalRamp(seedHex: any, steps: any): any;
  HARMONIES: Record<string, any>;
  harmony(seedHex: any, kind: any): any;
  paletteBuild(opts?: { seed?: any; scheme?: any; mode?: any }): any;
  AUDIT_PAIRS: any[];
  paletteAudit(tokens: any): any;

  // ── DESIGN TOKENS + EXPORT ──
  SCALE_RATIOS: Record<string, any>;
  typeScale(base: any, ratio: any): any;
  spaceScale(base: any): any;
  tokensBuild(d: any): any;
  EXPORT_FORMATS: Record<string, any>;
  exportTokens(fmt: any, t: any): any;

  // ── OFFLINE GRAPHICS ──
  mulberry32(a: any): any;
  rngFrom(seedStr: any): any;
  GEN_KINDS: Record<string, any>;
  genSvg(kind: any, opts: any): any;
  svgDataUri(svg: any): any;
  svgToPng(svg: any, w: any, h: any): any;

  // ── COMFYUI ──
  readonly COMFY: Record<string, any>;
  saveComfy(): any;
  readonly COMFY_INFO: any;
  comfyRaw(path: any, opts?: { method?: any; body?: any; binary?: any }): Promise<any>;
  comfyPing(): Promise<any>;
  comfyT2I(o: any): any;
  comfyFormatOf(obj: any): any;
  comfySubmit(graph: any): Promise<any>;
  comfyWait(promptId: any, onTick: any, maxMs: any): Promise<any>;
  comfyImage(ref: any): Promise<any>;
  comfyGenerate(opts: any, onTick: any): Promise<any>;
  comfyInterrupt(): Promise<any>;

  // ── DESIGN ASSET LIBRARY ──
  readonly ASSET_INDEX: any[];
  assetAdd(opts: { kind?: any; name?: any; dataUrl?: any; svg?: any; meta?: any }): Promise<any>;
  assetBody(id: any): Promise<any>;
  assetDelete(id: any): Promise<any>;

  // ── SKIN ENGINE — extreme, reversible UI editing ──
  readonly SKIN: Record<string, any>;
  saveSkin(): any;
  skinSanitize(css: any): any;
  skinSnapshot(): any;
  skinPaint(): any;
  skinRestore(snap: any): any;
  skinApply(skin: any, opts: any): any;
  skinUnwind(): any;
  skinUndo(): any;
  skinStock(): any;
  skinDisarmBar(): any;
  skinArmBar(seconds: any): any;
  skinBoot(): any;
  skinSuspended(): any;
  skinRestoreSuspended(): any;
  SKIN_PRESETS: Record<string, any>;
  SKIN_SCHEMA: Record<string, any>;
  skinFromBrief(brief: any, model: any): Promise<any>;
  skinDiff(): any;

  // ── THE REGRESSION GAUNTLET ──
  GAUNTLET_VERSION: number;
  gauntletCases(g: any): any;
  gauntletBuild(): any;
  gauntletRun(): any;
  readonly GAUNTLET_LAST: any;
  gauntletFileMark(): any;
  gauntletStale(): any;
  GAUNTLET_SABOTAGE: any[];
  gauntletSabotage(): any;
  gauntletReport(run: any): any;

  // ── MODEL FORGE ──
  FORGE_BACKENDS: Record<string, any>;
  OLLAMA_PARAMS: Record<string, any>;
  readonly FORGE: Record<string, any>;
  saveForge(): any;
  forgeDetect(): Promise<any>;
  forgeRecipe(o: any): any;
  forgeModelfile(recipe: any): any;
  forgeValidate(text: any): any;
  forgeBuild(recipe: any): Promise<any>;
  FORGE_SOURCES: Record<string, any>;
  forgeJsonl(rows: any): any;
  forgeJsonlCheck(text: any): any;
  readonly FORGE_EVAL: any;
  forgeAddFixture(f: any): any;
  forgeScore(output: any, fixture: any): any;
  forgeVerdict(before: any, after: any): any;

  // ── RESILIENCE ──
  ERROR_KINDS: Record<string, any>;
  classifyError(err: any, status: any): any;
  isRetryable(kind: any): any;
  backoffDelay(attempt: any, o: any): any;
  parseRetryAfter(headers: any): any;
  BREAKER_DEFAULTS: Record<string, any>;
  BREAKERS: Record<string, any>;
  saveBreakers(): any;
  breakerState(key: any, now: any): any;
  breakerRecord(key: any, ok: any, now: any): any;
  breakerAllows(key: any, now: any): any;
  resilientCall(key: any, fn: any, o: any): Promise<any>;
  coalesce(key: any, fn: any): any;
  inflightCount(): any;
  limiter(max: any): any;
  repairJson(text: any): any;
  validateAgainstSchema(value: any, schema: any): any;
  INJECTION_PATTERNS: any[];
  injectionScan(text: any, source: any): any;
  storageReport(): any;
  pct: any;
  estimateTokens(text: any): any;
  everyMs(name: any, fn: any, ms: any): any;
  timersStop(name: any): any;
  timersList(): any;

  // ── CONNECTION BUILDER ──
  AUTH_KINDS: Record<string, any>;
  SECRET_FIELDS: any[];
  CONNS: any[];
  saveConns(): any;
  CONN_SECRETS: Record<string, any>;
  saveConnSecrets(): any;
  connRedact(conn: any): any;
  connFromCurl(text: any): any;
  connBuildRequest(conn: any, vars: any): any;
  connTest(conn: any, vars: any): Promise<any>;
  connValidate(conn: any): any;
  connSave(conn: any): any;
  connArm(conn: any, vars: any): Promise<any>;

  // ── APPLE NOTES ──
  NOTES_SECTION: string;
  NOTES_IMPORT: any;
  saveNotesImport(): any;
  noteScore(n: any): any;
  notesPlan(notes: any, threshold: any): any;
  notesFetch(limit: any): Promise<any>;
  notesImport(keepList: any): any;
  notesBlock(limit: any): any;

  // ── CORDIS — reversible capability registry ──
  CORDIS_MODES: Record<string, any>;
  cordisCreate(): any;
  readonly CORDIS: any;

  // ── TOOLS ON THE FLY ──
  TOOL_STATES: Record<string, any>;
  FLYTOOLS: any[];
  saveFlyTools(): any;
  toolValidate(def: any): any;
  toolTest(def: any, sample: any): Promise<any>;
  toolArm(def: any, sample: any): Promise<any>;
  FLY_SCHEMAS: Record<string, any>;
  registerFlySchema(def: any): any;
  flyToolBlock(): any;
  toolDisarm(name: any): any;
  flyToolAllowed(name: any, phase: any): any;

  // ── TRAINING METHODS + DATASET PREP ──
  TRAIN_METHODS: Record<string, any>;
  methodRecommend(o: any): any;
  dsDetect(rows: any): any;
  dsToChatml(rows: any): any;
  dsToPreference(rows: any): any;
  dsHash(s: any): any;
  dsShingles(text: any, n: any): any;
  dsJaccard(a: any, b: any): any;
  dsDedupExact(rows: any): any;
  dsNearDupes(rows: any, threshold: any): any;
  dsLeakCheck(trainRows: any, evalRows: any, threshold: any): any;
  dsSplit(rows: any, o: any): any;
  dsStats(rows: any): any;
  dsPrepare(rows: any, o: any): any;

  // ── LoRA HYPERPARAMETERS ──
  LORA_HP: Record<string, any>;
  loraRecommend(o: any): any;
  loraDiagnose(trainLoss: any, validLoss: any): any;
  loraMemory(o: any): any;
  loraTemplateCheck(trainTemplate: any, serveTemplate: any): any;
  loraConfigPython(cfg: any, model: any): any;
  loraConfigMlx(cfg: any, model: any): any;

  // ── WORKING MEMORY ──
  WM_CAP: number;
  WM: any[];
  WM_PROMOTE_AT: number;
  saveWM(): any;
  wmScore(e: any, now: any): any;
  wmPut(key: any, value: any, tag: any): any;
  wmGet(key: any): any;
  wmTop(n: any, now: any): any;
  wmPromotable(): any;
  wmPromote(id: any): any;
  wmSweep(now: any): any;
  wmBlock(limit: any): any;

  // ── LOOP CONTRACT ──
  NODE_STATES: Record<string, any>;
  nodeReadySet(nodes: any): any;
  nodeCycles(nodes: any): any;
  nodeMarkDone(node: any, evidence: any): any;
  nodeInvalidate(node: any, why: any): any;

  // ── NOTIFICATIONS v2 ──
  NOTIFY_TYPES: Record<string, any>;
  NOTIFY2_DEFAULTS: Record<string, any>;
  NOTIFY2: Record<string, any>;
  saveNotify2(): any;
  NOTIFY_LOG: any[];
  notifyAllowed(type: any, now: any): any;
  quietNow(now: any): any;
  notifyAskPermission(): Promise<any>;
  notifyNative(title: any, body: any): Promise<any>;
  notify2(type: any, title: any, body: any, opts: any): Promise<any>;
  notifyWatchLongJob(label: any, ms: any): any;
  notifyStopWatch(): any;

  // ── NOTIFICATION SETTINGS UI ──
  renderNotify(): any;

  // ── GAUNTLET UI ──
  renderGauntlet(): any;
  gauntletHtml(r: any): any;

  // ── GHOSTTY + HARNESS HEALTH UI ──
  renderGhostty(): any;
  renderHarnessHealth(): any;

  // ── LOCAL MODELS TAB ──
  renderLocal(): any;

  // ── AGENT BAR + SUGGESTIONS ──
  renderAgentBar(): any;
  initLocal(): any;

  // ── DESIGN STUDIO — UI ──
  dsHeroArt(): any;
  renderDesign(): any;
  initDesign(): any;

  // ── AI SOFTWARE FACTORY ──
  FACTORY_STATIONS: Record<string, any>;
  FACTORY_ORDER: string[];
  FACTORY_SIZES: Record<string, any>;
  FACTORY_MODES: Record<string, any>;
  FACTORY_DEFAULTS: Record<string, any>;
  FACTORY: Record<string, any>;
  FACTORY_Q: any[];
  FACTORY_LOG: any[];
  flog(itemId: any, station: any, text: any, kind: any): any;
  factoryAdd(title: any, opts?: { size?: any; notes?: any }): any;
  factoryItem(id: any): any;
  nextStation(it: any): any;

  // ── AI SOFTWARE FACTORY › Program design: the station people skip ──
  programDesign(it: any, model: any): Promise<any>;

  // ── AI SOFTWARE FACTORY › Vertical slices ──
  verticalSlices(it: any, model: any): Promise<any>;

  // ── AI SOFTWARE FACTORY › Agentic code review ──
  factoryReview(it: any, code: any, model: any): Promise<any>;

  // ── AI SOFTWARE FACTORY › The tick ──
  factoryTick(): Promise<any>;
  factoryStart(): any;
  factoryStop(): any;
  factoryInterject(text: any, itemId: any): any;
  factorySetMode(m: any): any;
  FACTORY_TUNABLE: Record<string, any>;
  factoryMetrics(): any;
  factoryImprove(model: any): Promise<any>;
  factoryJudgeTune(): any;
  factoryAdvice(model: any): Promise<any>;

  // ── SKILL SELECTOR ──
  SKILL_MODES: Record<string, any>;
  SKILLSEL_DEFAULTS: Record<string, any>;
  SKILLSEL: Record<string, any>;
  skillScore(skill: any, task: any): any;
  SKILL_FLOOR: number;
  skillsRank(task: any, limit: any): any;
  skillsSelect(task: any, opts?: { model?: any; max?: any; force?: any }): Promise<any>;
  skillsBlockFor(names: any, limit: any): any;

  // ── SKILL SELECTOR › Skill → graph routing ──
  skillGraph(skill: any, task: any): any;
  skillRoutedContext(task: any, model: any, opts?: { max?: any; loopId?: any }): Promise<any>;

  // ── REPO → SKILL ──
  repoToSkill(owner: any, repo: any, model: any, onStep: any): Promise<any>;

  // ── YOLO MODE ──
  yoloRun(objective: any, opts?: { model?: any; rounds?: any; budget?: any; graphId?: any; onStep?: any; signal?: any }): Promise<any>;

  // ── GRAPH HEALTH & AUTO-LEARNING ──
  graphHealth(gid: any): any;
  graphCentral(gid: any, limit: any): any;
  graphLearnFromRun(gid: any, opts: { task?: any; outcome?: any; steps?: any; artifacts?: any; model?: any }): any;
  graphMerge(fromId: any, toId: any, opts?: { minConf?: any }): any;

  // ── CONTEXT ENGINEERING (Dex Horthy / HumanLayer) ──
  CTX_TARGET: Record<string, any>;
  CONF_FLOOR: Record<string, any>;
  contextUtilization(chars: any, model: any): any;
  COMPACT_SCHEMA: Record<string, any>;
  PROGRESS: any[];
  progressText(p: any): any;
  compactIntentional(transcript: any, model: any, label: any): Promise<any>;

  // ── CONTEXT ENGINEERING (Dex Horthy / HumanLayer) › Research → Plan → Implement ──
  RPI_PHASES: Record<string, any>;
  RPI: any[];
  rpiCreate(title: any): any;
  rpiRun(id: any, phase: any, opts?: { model?: any; graphId?: any; onUpdate?: any; signal?: any }): Promise<any>;

  // ── ACTIVATION TRACE — see what the memory actually did ──
  ACTIVATIONS: any[];
  actBegin(model: any, task: any): any;
  actUse(kind: any, label: any, why: any, chars: any): any;
  actWithhold(kind: any, label: any, why: any): any;
  actEnd(text: any): any;

  // ── PATH PRIMERS — a graph path as a running start ──
  graphPaths(gid: any, opts?: { from?: any; max?: any }): any;
  primerFor(gid: any, task: any, model: any): any;

  // ── LOCAL AI ASSIST ──
  ASSIST_DEFAULTS: Record<string, any>;
  ASSIST: Record<string, any>;
  ASSIST_ROLES: Record<string, any>;
  assistShouldFire(model: any, task: any): any;
  assistSupply(model: any, task: any, opts?: { graphId?: any; signal?: any }): Promise<any>;
  assistCheckpointRun(task: any, opts?: { localModel?: any; rounds?: any; graphId?: any; loopId?: any; onStep?: any; signal?: any }): Promise<any>;
  assistEffect(model: any, task: any, graphId: any): Promise<any>;

  // ── MEMORY SYNC — browser ⇄ bridge ⇄ every CLI ──
  MEM_REV: any;
  memoryPush(): Promise<any>;
  memoryPull(): Promise<any>;

  // ── AUTORESEARCH — bounded recursive self-improvement ──
  RSI_METRICS: Record<string, any>;
  RSI_TUNABLE: Record<string, any>;
  RSI: Record<string, any>;
  RSI_LOG: any[];
  rsiMeasure(task: any, model: any): Promise<any>;
  rsiBetter(metricId: any, a: any, b: any): any;
  rsiPropose(model: any, history: any): Promise<any>;
  rsiLoop(onStep: any): Promise<any>;

  // ── GITHUB REVERSE (*) ──
  GHR_MODES: Record<string, any>;

  /**
   * Read a repository through the GitHub connector and turn it into a build
   * prompt. Reads the files that *describe* how a project is built (readme, manifests, entry
   * points) rather than the biggest ones, capped at `opts.maxFiles` (default 12, clamped 3–40).
   * @param onStep Progress callback, called with a human-readable status line.
   * @param opts `mode` selects the output shape — `'spec'` (default), `'arch'`, `'stack'` or `'onboard'`.
   */
  githubReverse(owner: string, repo: string, model?: string, onStep?: ((msg: string) => void) | null, opts?: GithubReverseOptions): Promise<GithubReverseResult>;

  // ── 1. LETHAL TRIFECTA GUARD ──
  TRIFECTA: Record<string, any>;
  TRI: Record<string, any>;
  readonly TRI_STATE: Record<string, any>;
  trifectaReset(): any;
  trifectaMark(leg: any, why: any): any;
  trifectaStatus(): any;

  // ── 2. TOOL PERMISSION STATE MACHINE ──
  TOOL_ANNOT: Record<string, any>;
  PHASES: Record<string, any>;
  PHASE: Record<string, any>;
  toolAnnotations(tool: any): any;
  toolAllowed(tool: any, phase: any): any;
  phaseFilterTools(tools: any, phase: any): any;
  setToolPhase(p: any): any;

  // ── 3. OMNISEARCH ──
  omniSearch(q: any, limit: any): any;

  // ── 4. RUN NOTIFICATIONS ──
  NOTIFY: Record<string, any>;
  notifyPermission(): Promise<any>;
  notifyBeep(kind: any): any;
  notify(kind: any, title: any, body: any): any;

  // ── 5. MODEL DRIFT DETECTOR ──
  CANARIES: any[];
  canaryAdd(model: any, prompt: any, label: any): any;
  canaryRun(id: any, opts?: { setBaseline?: any }): Promise<any>;

  // ── 6. REFUSAL & STOP DIAGNOSTICS ──
  STOP_CLASSES: Record<string, any>;
  classifyStop(acc: any): any;
  rephraseRequest(original: any, model: any): Promise<any>;

  // ── 7. CONTEXT BUDGET HEATMAP ──
  contextHeatmap(messages: any, model: any): any;

  // ── BRAIN GRAPH ENGINEERING ──
  GRAPH_KINDS: Record<string, any>;
  EDGE_TYPES: Record<string, any>;
  PROVENANCE: Record<string, any>;
  GRAPHS: any[];
  graphCreate(name: any, kind: any): any;
  graphById(id: any): any;
  graphNode(g: any, opts: { label?: any; type?: any; body?: any; source?: any; refs?: any }): any;
  graphEdge(g: any, fromId: any, type: any, toId: any, opts?: { provenance?: any; note?: any }): any;
  edgeConfidence(e: any): any;
  graphReinforce(gid: any, nodeIds: any, won: any): any;
  graphQuery(gid: any, task: any, opts?: { depth?: any; max?: any; minConf?: any }): any;
  graphBlock(gid: any, task: any, limit: any): any;
  graphLearn(gid: any, opts: { from?: any; edge?: any; to?: any; fromType?: any; toType?: any; body?: any; provenance?: any; note?: any }): any;
  graphFromBrain(gid: any, model: any, hostEl: any): Promise<any>;

  // ── OFFICE ARTIFACTS › Word ──
  officeDocx(doc: any): any;

  // ── OFFICE ARTIFACTS › Excel ──
  officeXlsx(book: any): any;

  // ── OFFICE ARTIFACTS › PowerPoint (*) ──
  officePptx(deck: any): any;

  /**
   * The three document kinds, each with its OOXML builder and MIME type.
   */
  OFFICE_KINDS: Record<OfficeKind, OfficeKindSpec>;

  /**
   * The strict JSON schema each document kind is generated against, so the model
   * returns a document rather than prose describing one.
   */
  OFFICE_SCHEMA: Record<OfficeKind, Record<string, any>>;

  /**
   * Ask a model for a document in the JSON schema each builder needs, then
   * build it. Schema-constrained, so the result is a document rather than prose describing one.
   * @param model Defaults to `settings.archModel`.
   */
  officeGenerate(kind: OfficeKind, brief: string, model?: string): Promise<OfficeGenerateResult>;
  officeDownload(blob: any, name: any, ext: any): any;

  // ── PAPERCLIP ──
  PAPERCLIP_DEFAULTS: Record<string, any>;
  PCLIP: Record<string, any>;
  pclipFetch(path: any): Promise<any>;
  pclipDiscover(): Promise<any>;
  pclipLoad(): Promise<any>;

  // ── PROJECTS — separate desktops ──
  PROJECT_KEYS: any[];
  PROJECT_GLOBAL: any[];
  PROJECTS: any;
  ACTIVE_PROJECT: any;
  activeProject(): any;
  brainKey(pid: any): any;
  pKey(pid: any, k: any): any;
  projectStash(pid: any): any;
  projectRestore(pid: any): any;
  projectMigrate(): Promise<any>;
  projectCreate(name: any): any;
  projectSwitch(pid: any): Promise<any>;
  projectDelete(pid: any): any;

  // ── TRACE VAULT — never lose a reasoning trace ──
  TRACES: any[];
  traceAutoSave(acc: any, meta: any): any;
  tracePromote(id: any): Promise<any>;
  brainOfferSetup(what: any): any;

  // ── MIXTURE OF AGENTS ──
  MOA_DEFAULTS: Record<string, any>;
  MOA: Record<string, any>;
  moaProposers(): any;
  moaRun(task: any, onStep: any, signal: any): Promise<any>;

  // ── ASSISTANT — the front door ──
  ASST_MODES: Record<string, any>;
  ASST_DEFAULTS: Record<string, any>;
  ASST: Record<string, any>;
  ACHATS: any[];
  ACHAT: any;
  asstMode(): any;
  asstCfg(): any;
  achatNew(title: any): any;
  achat(): any;
  asstSystem(): any;
  asstSend(text: any): Promise<any>;

  // ── GLASS-PANE ──
  PANE: any[];
  PANE_SOURCES: Record<string, any>;
  paneEvent(source: any, kind: any, detail: any): any;
  paneFromLog(e: any): any;
  paneStats(): any;
  paneLive(): Promise<any>;

  // ── OPENHANDS / AGENT CANVAS ──
  OH_DEFAULTS: Record<string, any>;
  OH: Record<string, any>;
  ohFetch(path: any): Promise<any>;
  ohProbe(): Promise<any>;
  ohSessions(): Promise<any>;

  // ── TERMINAL ──
  TERMS: any[];
  TERM_ACTIVE: any;
  TERM_PRESETS: any[];
  termNew(cmd: any, cwd: any): any;
  termWrite(t: any, text: any, cls: any): any;
  termRun(t: any): Promise<any>;
  termInput(t: any, text: any): Promise<any>;
  termKill(t: any): Promise<any>;

  // ── TERMINAL › Glass-Pane rendering ──
  PANE_FILTER: Set<any>;
  renderPane(): any;
  renderPaneLive(): Promise<any>;
  initPane(): any;

  // ── TERMINAL › Terminal rendering ──
  renderTerm(): any;
  termOpen(cmd: any, cwd: any): any;
  initTerm(): any;

  // ── TERMINAL › Where does this answer belong? (*) ──

  /**
   * Where each artifact kind can be opened, and the one-line reason shown on the
   * offer button.
   */
  ASST_ROUTES: Record<AsstRouteKind, { tab: string; icon: string; label: string; why: string }>;

  /**
   * Classify an assistant reply into the places it could be opened. Deliberately
   * **structural**, not prose-based: `===FILE: name===` markers, fenced code blocks of a known
   * language ≥180 chars, a full HTML page, ≥3 Markdown headings, a real Markdown table, ≥3
   * slide-like sections, or a concrete `owner/repo` reference. Returns at most 3 offers, and
   * nothing at all for text under 40 characters.
   */
  asstArtifacts(text: string): AsstArtifact[];

  /**
   * Act on an offer — moves the *content*, not just the user. `'studio'` parses
   * files into the workspace and runs the preview, `'office'` seeds the Office brief, and
   * `'reverse'` fills the repo field. Shows a toast and returns early when there is nothing
   * file-shaped to open or the target tab is unavailable.
   */
  asstTakeOffer(kind: AsstRouteKind, payload: string | null | undefined, text: string): void;

  /**
   * Show the floating "open this where it belongs" bar, for artifacts produced
   * outside the chat thread. Auto-hides after 14 seconds. Unknown kinds are ignored.
   */
  asstOffer(kind: AsstRouteKind, note?: string): void;
  renderAsst(): any;
  initAsst(): any;

  // ── TERMINAL › Projects ──
  renderProjects(): any;
  initProjects(): any;

  // ── TERMINAL › Trace vault ──
  renderTraces(): any;
  initTraces(): any;

  // ── TERMINAL › Office Studio (*) ──

  /**
   * Office Studio state: the current document, its revision stack and view settings.
   */
  OFFICE: OfficeState;

  /**
   * Build a real OOXML file from a document object, with no dependencies.
   * @throws `unknown document kind` for anything but docx/xlsx/pptx.
   */
  officeBuild(kind: OfficeKind, doc: OfficeDoc): Blob;

  /**
   * Push a deep copy of `doc` onto the revision stack, truncating any redo branch.
   * Capped at 12 revisions. Sets `OFFICE.doc` and `OFFICE.name`.
   */
  officePush(doc: OfficeDoc, note?: string): void;

  /**
   * Jump to revision `i` and re-render. Out-of-range indices are ignored.
   */
  officeGoRev(i: number): void;

  /**
   * Revise the **current** document rather than regenerating from the brief,
   * so an instruction like "shorter" acts on what the user is looking at. The model is required
   * to return the complete document in the same schema, not a diff.
   */
  officeRefineDoc(kind: OfficeKind, doc: OfficeDoc, instruction: string, model?: string): Promise<OfficeRefineResult>;

  /**
   * HTML preview of a document, rendered from the same object the OOXML
   * builders consume — so what is on screen is what lands in the file. Editable nodes carry
   * `data-ed` paths for {@link GlassBoxAPI.officeApplyEdit}. Returns `''` for a null doc.
   */
  officePreview(kind: OfficeKind, doc: OfficeDoc | null): string;

  /**
   * HTML for the outline rail: slides for pptx, sheets for xlsx, headings for
   * docx. Each row carries `data-jump` with its index.
   */
  officeOutline(kind: OfficeKind, doc: OfficeDoc | null): string;

  /**
   * Plain-text / Markdown export — the escape hatch for the content without Office.
   */
  officeText(kind: OfficeKind, doc: OfficeDoc | null): string;

  /**
   * Write an inline edit back into `OFFICE.doc`. The path encodes where it
   * came from, so one handler serves all three kinds:
   * `title`, `s{n}.title`, `s{n}.b{m}`, `b{n}.text`, `sh{n}.r{r}.c{c}`.
   * Unrecognised paths are ignored. Sheet rows/cells are grown as needed.
   */
  officeApplyEdit(path: string, value: string): void;

  /**
   * Repaint the Office Studio pane from `OFFICE`. No-op when `#of-paper` is absent.
   */
  officeRender(): void;

  // ── TERMINAL › Document templates ──
  OFFICE_TEMPLATES: any[];
  officeTemplates(): any;
  initOffice(): any;

  // ── TERMINAL › Paperclip ──
  initPclip(): any;

  // ── TERMINAL › Model presets (*) ──

  /**
   * The model presets, seeded from `MPRESET_SEED` and persisted.
   */
  MPRESETS: ModelPreset[];

  /**
   * Id of the currently applied model preset.
   */
  MPRESET_CUR: string;

  /**
   * Look up a preset, falling back to the first one rather than returning null.
   */
  mpresetById(id: string): ModelPreset;

  /**
   * Write a preset through to the real `settings` and the real MoA config, then
   * re-render — a preset that needed a reload to take effect would be a trap. Empty `arch` /
   * `build` fields are left alone (that is how the local-only preset works). `moaLayers` is
   * clamped to 1–4.
   * @returns The applied preset, or null for an unknown id.
   */
  mpresetApply(id: string): ModelPreset | null;

  /**
   * Repaint the Model Hub tab. No-op when `#mh-preset` is absent.
   */
  renderModelHub(): void;
  initMoa(): any;

  // ── TERMINAL › Graphs ──
  renderGraphs(): any;
  initGraphs(): any;

  // ── TERMINAL › Memory bus, tiers, tracks, loops ──
  renderMemBus(): any;
  initMemBus(): any;

  // ── TERMINAL › Visualiser + knowledge chat UI ──
  initViz(): any;

  // ── TERMINAL › AI Factory UI ──
  renderFactory(): any;
  initFactory(): any;

  // ── TERMINAL › Skills console: selector, YOLO, repo→skill ──
  renderSkillSel(): any;
  initSkillSel(): any;

  // ── TERMINAL › Graph health ──
  renderGraphHealth(): any;

  // ── TERMINAL › Research → Plan → Implement ──
  renderRpi2(): any;
  initRpi2(): any;

  // ── TERMINAL › Activation view + Local AI Assist ──
  renderActivation(): any;
  renderAssist(): any;
  initAssistUI(): any;

  // ── TERMINAL › Omnisearch ──
  omniOpen(): any;
  omniClose(): any;
  initOmni(): any;
  renderGuards(): any;
  initGuards(): any;

  // ── TERMINAL › Autoresearch + GitHub reverse ──
  renderRsi(): any;
  initRsi(): any;
  initGhRev(): any;

  // ── TERMINAL › Brain console rendering ──
  renderBrainConsole(): any;
  initBrainConsole(): any;

  // ── OPS CONSOLE ──
  renderAdvisors(): any;
  renderForecast(): any;
  initOps(): any;
  renderEffStats(): any;
  renderRouteInfo(): any;

  // ── LIBRARY: skills, prompts, portability ──
  buildPack(includeKey: any): any;

  // ── MISSION CONTROL TAB ──
  sparkline(values: any, opts?: { w?: any; h?: any; label?: any; fmtv?: any; color?: any }): any;
  msub(id: any): any;
  renderMonitor(): any;
  renderSessions(): any;
  renderComms(): any;

  // ── RUN DIVERGENCE ──
  tdStepKey(s: any): any;
  tdAlign(A: any, B: any): any;
  traceDiff(A: any, B: any): any;
  tdSourceList(): any;
  tdSpansFor(id: any): any;
  renderRunDiff(): any;
  initRunDiff(): any;
  renderTrace(): any;
  renderTraceFlags(): any;
  renderConnectors(): any;
  renderExperiments(): any;
  initMission(): any;

  // ── METRICS TAB ──
  cash(v: any): any;
  renderMetrics(): any;
  initMetrics(): any;

  // ── CREATIONS TAB ──
  renderCreations(): any;
  initCreations(): any;

  // ── CUSTOMISE TAB ──
  csub(id: any): any;
  renderCzThemes(): any;
  readonly CSS_VERSIONS: any[];
  cssLoadVersions(): Promise<any>;
  cssSnapshot(label: any): Promise<any>;
  renderCzFx(): any;
  renderCssVersions(): any;
  renderCzGenerator(): any;
  renderCzTokens(): any;
  renderCustomise(): any;
  initCustomise(): any;

  // ── COMMAND PALETTE ──
  paletteItems(): any;
  palScore(q: any, text: any): any;
  openPalette(): any;
  closePalette(): any;

  // ── FORGE TAB ──
  subgo(id: any): any;
  initForge(): any;

  // ── DEVICES TAB ──
  renderDevResults(): any;
  initDevices(): any;

  // ── HANDOFF TAB ──
  initHandoff(): any;

  // ── PROVIDERS UI ──
  renderProviders(): any;
  initProviders(): any;
  scrub(o: any): any;

  // ── UI CUSTOMISATION (*) ──
  UI_FX: Record<string, any>;
  UI_DEFAULTS: Record<string, any>;
  UI: Record<string, any>;
  readonly REGISTRY: Record<string, any>;
  slugify(s: any): any;
  buildRegistry(): any;
  tabHidden(id: any): any;
  cardHidden(id: any): any;
  firstVisibleTab(): any;
  applyUI(): any;
  UI_TOKEN_LIST: Record<string, any>;
  UI_FONTS: Record<string, any>;
  UI_MONOS: Record<string, any>;
  hsl(h: any, s: any, l: any): any;
  makeTheme(opts?: { hue?: any; accent?: any; sat?: any; mode?: any; pop?: any; contrast?: any }): any;
  THEME_SEEDS: any[];
  UI_THEMES: Record<string, any>;
  applyThemePreset(id: any): any;
  applyGeneratedTheme(seed: any): any;
  UI_PROFILES: Record<string, any>;
  applyProfile(id: any): any;
  stripEdges(n: any): any;

  /**
   * Toggle the `more-l` / `more-r` scroll affordances on the tab strip. Cheap enough
   * to call on every scroll, and the only thing telling the user that 31 tabs do not fit.
   */
  tabEdges(): void;

  /**
   * Switch tabs. A tab hidden in Customise is *unreachable*, not merely invisible — the
   * call is redirected to the first visible tab with a toast. Scrolls the active tab into view
   * and calls the render function that owns the destination.
   */
  go(view: string): void;

  // ── core › properties defined inline on the export (*) ──

  /**
   * Set the OpenRouter API key, persist it, and refresh the key pill in the header.
   */
  setKey(k: string): void;

  /**
   * Replace the ops bag wholesale. The only writer exposed for `OPS`.
   */
  setOPS(o: Record<string, any>): void;
}

declare global {
  interface Window {
    /** The GlassBox automation surface. Present once `boot()` has run. */
    __gb: GlassBoxAPI;
  }
}

export {};
