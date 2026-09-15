import { Queue, Worker } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, getPool, isPostgreSQL } from '../database';
import { runInstagramAgent, isRateLimitError, isRequestTooLargeError } from '../services/agent';
import {
  fetchMentionedComment,
  fetchMentionedMedia,
  sendInstagramDm,
} from '../services/instagramService';

export interface InstagramInboundEvent {
  kind: 'message' | 'mention';
  eventId: string;
  senderIgsid: string;
  senderUsername?: string | null;
  text: string;
  shareUrl: string | null;
  mid: string | null;
  commentId?: string | null;
  mediaId?: string | null;
}

interface QueueConnectionConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  family: number;
  tls?: Record<string, never>;
}

const getFirstEnvValue = (keys: string[]): string | null => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

const parsePort = (rawPort: string | null, fallback: number): number => {
  if (!rawPort) return fallback;
  const parsed = Number.parseInt(rawPort, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const buildQueueConnection = (): QueueConnectionConfig => {
  const envHost = getFirstEnvValue(['REDIS_HOST', 'REDISHOST']) || '127.0.0.1';
  const envPort = parsePort(getFirstEnvValue(['REDIS_PORT', 'REDISPORT']), 6379);
  const envUsername = getFirstEnvValue(['REDIS_USER', 'REDISUSER']);
  const envPassword = getFirstEnvValue(['REDIS_PASSWORD', 'REDISPASSWORD']);
  const redisUrl = getFirstEnvValue(['REDIS_URL', 'REDIS_PUBLIC_URL']);

  if (redisUrl) {
    try {
      const parsedUrl = new URL(redisUrl);
      const connection: QueueConnectionConfig = {
        host: parsedUrl.hostname || envHost,
        port: parsePort(parsedUrl.port || null, envPort),
        family: 0,
      };
      const urlUsername = parsedUrl.username ? decodeURIComponent(parsedUrl.username) : null;
      const urlPassword = parsedUrl.password ? decodeURIComponent(parsedUrl.password) : null;
      const username = urlUsername || envUsername;
      const password = urlPassword || envPassword;
      if (username) connection.username = username;
      if (password) connection.password = password;
      if (parsedUrl.protocol === 'rediss:') connection.tls = {};
      return connection;
    } catch (error) {
      console.warn('[instagramQueue] Invalid REDIS_URL, falling back to REDIS_HOST/REDIS_PORT.', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const connection: QueueConnectionConfig = { host: envHost, port: envPort, family: 0 };
  if (envUsername) connection.username = envUsername;
  if (envPassword) connection.password = envPassword;
  return connection;
};

const queueConnection = buildQueueConnection();

export const instagramQueue = new Queue<InstagramInboundEvent>('instagram-events', {
  connection: queueConnection,
});

let instagramWorker: Worker<InstagramInboundEvent> | null = null;

const UNLINKED_DM =
  'Seu Instagram ainda não está ligado à Jarvi. Em Configurações → Apps → Instagram, gere o código e me mande aqui no Direct (ex.: LIGA 123456).';

export const extractLigaCode = (text: string): string | null => {
  const match = text.toUpperCase().match(/LIGA\s*(\d{6})/);
  return match ? match[1] : null;
};

const claimEvent = async (eventId: string): Promise<boolean> => {
  const now = new Date().toISOString();
  const id = uuidv4();
  try {
    if (isPostgreSQL()) {
      const result = await getPool().query(
        `INSERT INTO instagram_events (id, event_id, user_id, task_id, status, created_at)
         VALUES ($1, $2, NULL, NULL, 'received', $3)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING id`,
        [id, eventId, now],
      );
      return (result.rowCount ?? 0) === 1;
    }
    await getDatabase().run(
      `INSERT INTO instagram_events (id, event_id, user_id, task_id, status, created_at)
       VALUES (?, ?, NULL, NULL, 'received', ?)`,
      [id, eventId, now],
    );
    return true;
  } catch {
    return false;
  }
};

const updateEvent = async (
  eventId: string,
  status: string,
  userId: string | null,
  taskId: string | null,
): Promise<void> => {
  if (isPostgreSQL()) {
    await getPool().query(
      `UPDATE instagram_events SET status = $1, user_id = $2, task_id = $3 WHERE event_id = $4`,
      [status, userId, taskId, eventId],
    );
    return;
  }
  await getDatabase().run(
    `UPDATE instagram_events SET status = ?, user_id = ?, task_id = ? WHERE event_id = ?`,
    [status, userId, taskId, eventId],
  );
};

const findUserByIgsid = async (
  igsid: string,
): Promise<{ id: string } | null> => {
  if (!igsid) return null;
  if (isPostgreSQL()) {
    const result = await getPool().query(
      `SELECT id FROM users WHERE instagram_verified = TRUE AND instagram_igsid = $1 LIMIT 1`,
      [igsid],
    );
    return result.rows[0] ?? null;
  }
  const row = await getDatabase().get(
    `SELECT id FROM users WHERE instagram_verified = 1 AND instagram_igsid = ? LIMIT 1`,
    [igsid],
  );
  return (row as { id: string } | undefined) ?? null;
};

const findUserByUsername = async (
  username: string,
): Promise<{ id: string } | null> => {
  const normalized = username.replace(/^@/, '').trim().toLowerCase();
  if (!normalized) return null;
  if (isPostgreSQL()) {
    const result = await getPool().query(
      `SELECT id FROM users
       WHERE instagram_verified = TRUE AND lower(instagram_username) = $1
       LIMIT 1`,
      [normalized],
    );
    return result.rows[0] ?? null;
  }
  const row = await getDatabase().get(
    `SELECT id FROM users
     WHERE instagram_verified = 1 AND lower(instagram_username) = ?
     LIMIT 1`,
    [normalized],
  );
  return (row as { id: string } | undefined) ?? null;
};

const bindUserByLigaCode = async (
  code: string,
  igsid: string,
  username: string | null,
): Promise<{ id: string } | null> => {
  const now = new Date().toISOString();
  if (isPostgreSQL()) {
    const result = await getPool().query(
      `UPDATE users
       SET instagram_igsid = $1,
           instagram_username = COALESCE($2, instagram_username),
           instagram_verified = TRUE,
           instagram_link_code = NULL,
           instagram_link_code_expires_at = NULL,
           instagram_connected_at = $3,
           updated_at = $3
       WHERE instagram_link_code = $4
         AND instagram_link_code_expires_at > $3
       RETURNING id`,
      [igsid, username, now, code],
    );
    return result.rows[0] ?? null;
  }
  const db = getDatabase();
  const pending = await db.get(
    `SELECT id FROM users
     WHERE instagram_link_code = ? AND instagram_link_code_expires_at > ?`,
    [code, now],
  );
  if (!pending?.id) return null;
  await db.run(
    `UPDATE users
     SET instagram_igsid = ?,
         instagram_username = COALESCE(?, instagram_username),
         instagram_verified = 1,
         instagram_link_code = NULL,
         instagram_link_code_expires_at = NULL,
         instagram_connected_at = ?,
         updated_at = ?
     WHERE id = ?`,
    [igsid, username, now, now, pending.id],
  );
  return { id: String(pending.id) };
};

const buildAgentMessage = async (
  event: InstagramInboundEvent,
): Promise<{
  userMessage: string;
  commentId: string | null;
  mediaId: string | null;
  permalink: string | null;
}> => {
  const parts: string[] = [];
  let commentId = event.commentId || null;
  let mediaId = event.mediaId || null;
  let permalink: string | null = null;

  if (event.kind === 'mention') {
    if (commentId) {
      const comment = await fetchMentionedComment(commentId);
      if (comment?.text) parts.push(`Comentário: ${comment.text}`);
      if (comment?.mediaId) mediaId = comment.mediaId;
    } else if (event.text) {
      parts.push(`Comentário: ${event.text}`);
    }
    if (mediaId) {
      const media = await fetchMentionedMedia(mediaId);
      if (media?.caption) parts.push(`Legenda do post: ${media.caption}`);
      if (media?.permalink) {
        permalink = media.permalink;
        parts.push(`Link do post: ${media.permalink}`);
      }
    }
    if (parts.length === 0 && event.text) parts.push(event.text);
    if (parts.length === 0) {
      parts.push(
        'O usuário marcou a Jarvi em um post do Instagram. Crie uma tarefa honesta para rever o post; a API não entregou a legenda.',
      );
    }
  } else {
    if (event.text) parts.push(event.text);
    if (event.shareUrl) parts.push(`Conteúdo compartilhado: ${event.shareUrl}`);
  }

  return {
    userMessage: parts.join('\n\n'),
    commentId,
    mediaId,
    permalink,
  };
};

const processEvent = async (event: InstagramInboundEvent): Promise<void> => {
  const claimed = await claimEvent(event.eventId);
  if (!claimed) return;

  const liga = extractLigaCode(event.text || '');
  if (liga && event.senderIgsid) {
    try {
      const bound = await bindUserByLigaCode(
        liga,
        event.senderIgsid,
        event.senderUsername || null,
      );
      if (bound) {
        await updateEvent(event.eventId, 'linked', bound.id, null);
        await sendInstagramDm(
          event.senderIgsid,
          'Instagram ligado. Pode me mandar um recado ou marcar @jarvi.life nos posts.',
        );
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('UNIQUE') || message.includes('23505')) {
        await sendInstagramDm(
          event.senderIgsid,
          'Este Instagram já está ligado a outra conta Jarvi.',
        );
        await updateEvent(event.eventId, 'failed', null, null);
        return;
      }
      throw error;
    }
    if (event.senderIgsid) {
      await sendInstagramDm(
        event.senderIgsid,
        'Não achei esse código ou ele expirou. Gere um novo em Configurações → Apps → Instagram.',
      );
    }
    await updateEvent(event.eventId, 'failed', null, null);
    return;
  }

  let user = event.senderIgsid ? await findUserByIgsid(event.senderIgsid) : null;
  if (!user && event.senderUsername) {
    user = await findUserByUsername(event.senderUsername);
  }

  if (!user) {
    if (event.senderIgsid) await sendInstagramDm(event.senderIgsid, UNLINKED_DM);
    await updateEvent(event.eventId, 'ignored_unlinked', null, null);
    return;
  }

  const { userMessage, commentId, mediaId, permalink } = await buildAgentMessage(event);
  if (!userMessage.trim()) {
    await updateEvent(event.eventId, 'failed', user.id, null);
    return;
  }

  try {
    const redis = await instagramQueue.client;
    const reply = await runInstagramAgent(user.id, userMessage, redis as never, {
      originalUserMessage: userMessage,
      commentId,
      mediaId,
      permalink,
    });
    if (event.senderIgsid) await sendInstagramDm(event.senderIgsid, reply);
    await updateEvent(event.eventId, 'created', user.id, null);
  } catch (error) {
    console.error('[instagram] agent failed:', error);
    const fallback = isRequestTooLargeError(error)
      ? 'Esse conteúdo é grande demais para processar agora.'
      : isRateLimitError(error)
        ? 'Estou ocupado agora. Tenta de novo em instantes.'
        : 'Tive um problema para processar. Tenta de novo em alguns segundos.';
    if (event.senderIgsid) await sendInstagramDm(event.senderIgsid, fallback);
    await updateEvent(event.eventId, 'failed', user.id, null);
  }
};

export const enqueueInstagramEvent = async (event: InstagramInboundEvent): Promise<void> => {
  await instagramQueue.add('instagram-event', event, {
    jobId: event.eventId,
    removeOnComplete: 100,
    removeOnFail: 50,
  });
};

export const processInstagramEventDirect = async (event: InstagramInboundEvent): Promise<void> => {
  await processEvent(event);
};

export const initializeInstagramWorker = (): Worker<InstagramInboundEvent> => {
  if (instagramWorker) return instagramWorker;
  instagramWorker = new Worker<InstagramInboundEvent>(
    'instagram-events',
    async (job) => {
      await processEvent(job.data);
    },
    { connection: queueConnection },
  );
  instagramWorker.on('failed', (job, error) => {
    console.error('[instagram] worker job failed:', {
      jobId: job?.id,
      error: error.message,
    });
  });
  return instagramWorker;
};
