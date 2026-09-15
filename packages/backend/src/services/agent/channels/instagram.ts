/**
 * Instagram channel adapter — same contract as WhatsApp: one string reply,
 * tasks created directly, history in Redis.
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { extractMemoryPostResponse, getUserProfile } from '../core/memory';
import { buildSystemPrompt, buildInstagramExtras } from '../core/prompt';
import { runAgent } from '../core/runAgent';
import {
  getActiveTaskCount,
  getCompletedTaskCount,
  getUserActiveTasks,
  getUserCategories,
} from '../core/tasks';
import { getDateTimeForTimezone } from '../core/time';
import { shouldRetryWithForcedTool } from '../core/guardrails';
import { recordAgentTurnUsage, sumAgentTurnUsage } from '../core/telemetry';
import type {
  AgentContext,
  ChannelProfile,
  ConversationMessage,
  RedisLike,
} from '../core/types';

const historyKey = (userId: string) => `instagram:agent:history:${userId}`;
const historyDateKey = (userId: string) => `instagram:agent:history:date:${userId}`;
const HISTORY_TTL_SECONDS = 24 * 60 * 60;
const MAX_HISTORY_MESSAGES = 20;

async function loadHistory(
  redis: RedisLike,
  userId: string,
  todayIso: string,
): Promise<ConversationMessage[]> {
  try {
    const [raw, storedDate] = await Promise.all([
      redis.get(historyKey(userId)),
      redis.get(historyDateKey(userId)),
    ]);

    if (!storedDate || storedDate !== todayIso) {
      await redis.set(historyKey(userId), JSON.stringify([]), 'EX', HISTORY_TTL_SECONDS);
      await redis.set(historyDateKey(userId), todayIso, 'EX', HISTORY_TTL_SECONDS);
      return [];
    }

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (m): m is ConversationMessage =>
            (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

async function appendHistory(
  redis: RedisLike,
  userId: string,
  userMsg: string,
  assistantMsg: string,
  todayIso: string,
): Promise<void> {
  try {
    const history = await loadHistory(redis, userId, todayIso);
    history.push({ role: 'user', content: userMsg });
    history.push({ role: 'assistant', content: assistantMsg });
    const trimmed = history.slice(-MAX_HISTORY_MESSAGES);
    await Promise.all([
      redis.set(historyKey(userId), JSON.stringify(trimmed), 'EX', HISTORY_TTL_SECONDS),
      redis.set(historyDateKey(userId), todayIso, 'EX', HISTORY_TTL_SECONDS),
    ]);
  } catch {
    // best-effort
  }
}

const INSTAGRAM_PROFILE: ChannelProfile = {
  id: 'instagram',
  taskCreationTarget: 'tasks',
  toolsAvailable: [
    'create_task',
    'update_task',
    'complete_task',
    'delete_task',
    'search_tasks',
    'update_memory',
  ],
  outputFormat: 'plain',
  transport: 'single',
  enableBriefing: true,
  enableMemoryReconciliation: false,
  enableDedup: true,
  enableAntiHallucinationRetry: true,
  supportsTaskMode: false,
  systemPromptExtras: buildInstagramExtras,
};

export interface RunInstagramAgentOptions {
  originalUserMessage?: string;
  commentId?: string | null;
  mediaId?: string | null;
  permalink?: string | null;
}

export const runInstagramAgent = async (
  userId: string,
  userMessage: string,
  redis: RedisLike,
  options: RunInstagramAgentOptions = {},
): Promise<string> => {
  const [
    { memory, timezone, preferredName, email, subscriptionStatus },
    activeTasks,
    activeTaskCount,
    completedTaskCount,
    categories,
  ] = await Promise.all([
    getUserProfile(userId),
    getUserActiveTasks(userId),
    getActiveTaskCount(userId),
    getCompletedTaskCount(userId),
    getUserCategories(userId),
  ]);

  const ctx: AgentContext = {
    userId,
    email,
    preferredName,
    timezone,
    memory,
    activeTasks,
    activeTaskCount,
    completedTaskCount,
    lists: [],
    categories,
    mode: 'general',
    originalUserMessage: options.originalUserMessage ?? userMessage,
    instagramCommentId: options.commentId ?? null,
    instagramMediaId: options.mediaId ?? null,
    instagramPermalink: options.permalink ?? null,
  };

  const systemPrompt = buildSystemPrompt(ctx, INSTAGRAM_PROFILE);
  const { isoDate, weekday, ddmm } = getDateTimeForTimezone(timezone);
  const history = await loadHistory(redis, userId, isoDate);

  const dateCorrectionPair: ChatCompletionMessageParam[] =
    history.length > 0
      ? [
          { role: 'user', content: '[SISTEMA] Qual é a data de hoje?' },
          { role: 'assistant', content: `Hoje é ${weekday}, ${ddmm}.` },
        ]
      : [];

  const initialMessages: ChatCompletionMessageParam[] = [
    ...history.map(
      (m) => ({ role: m.role, content: m.content } as ChatCompletionMessageParam),
    ),
    ...dateCorrectionPair,
    { role: 'user', content: userMessage },
  ];

  let { text, toolCallNames, usage } = await runAgent(
    INSTAGRAM_PROFILE,
    ctx,
    systemPrompt,
    initialMessages,
    {},
  );
  let retried = false;

  if (
    INSTAGRAM_PROFILE.enableAntiHallucinationRetry &&
    shouldRetryWithForcedTool(text, toolCallNames)
  ) {
    const retry = await runAgent(
      INSTAGRAM_PROFILE,
      ctx,
      systemPrompt,
      initialMessages,
      {},
      { forceToolChoice: true },
    );
    text = retry.text || text;
    toolCallNames = [...toolCallNames, ...retry.toolCallNames];
    usage = sumAgentTurnUsage([usage, retry.usage]);
    retried = true;
  }

  recordAgentTurnUsage({
    email,
    channel: 'instagram',
    subscriptionStatus,
    usage,
    retried,
  });

  const finalResponse = text || 'Entendido! Como posso te ajudar?';
  await appendHistory(redis, userId, userMessage, finalResponse, isoDate);
  extractMemoryPostResponse(userId, userMessage, memory).catch((err) => {
    console.error('[Instagram Memory extraction] failed:', err);
  });

  return finalResponse;
};
