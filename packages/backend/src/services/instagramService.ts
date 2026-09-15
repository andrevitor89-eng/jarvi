import crypto from 'crypto';

const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || 'v21.0';
const GRAPH_BASE = (process.env.INSTAGRAM_GRAPH_BASE || 'https://graph.facebook.com').replace(
  /\/$/,
  '',
);

export const jarviInstagramHandle = (): string =>
  (process.env.INSTAGRAM_IG_USERNAME || 'jarvi.life').replace(/^@/, '').trim().toLowerCase();

export const textMentionsJarvi = (text: string): boolean => {
  const handle = jarviInstagramHandle();
  if (!handle || !text.trim()) return false;
  return text.toLowerCase().includes(`@${handle}`);
};

export const isInstagramWebhookConfigured = (): boolean =>
  Boolean(process.env.INSTAGRAM_APP_SECRET?.trim() && process.env.INSTAGRAM_VERIFY_TOKEN?.trim());

export const isInstagramMessagingConfigured = (): boolean =>
  Boolean(process.env.INSTAGRAM_PAGE_TOKEN?.trim() && process.env.INSTAGRAM_IG_USER_ID?.trim());

export const verifyInstagramSignature = (rawBody: Buffer, signatureHeader: string | undefined): boolean => {
  const appSecret = process.env.INSTAGRAM_APP_SECRET?.trim();
  if (!appSecret || !signatureHeader) return false;
  const expected = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;
  const digest = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(digest, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const accessToken = (): string => process.env.INSTAGRAM_PAGE_TOKEN?.trim() || '';

const igUserId = (): string => process.env.INSTAGRAM_IG_USER_ID?.trim() || '';

async function graphGet<T>(pathAndQuery: string): Promise<T> {
  const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${pathAndQuery}${
    pathAndQuery.includes('?') ? '&' : '?'
  }access_token=${encodeURIComponent(accessToken())}`;
  const res = await fetch(url);
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message || `Graph GET failed (${res.status})`);
  }
  return json;
}

async function graphPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: accessToken() }),
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message || `Graph POST failed (${res.status})`);
  }
  return json;
}

export const sendInstagramDm = async (igsid: string, text: string): Promise<void> => {
  if (!isInstagramMessagingConfigured() || !igsid || !text.trim()) return;
  const igId = igUserId();
  try {
    await graphPost(`${igId}/messages`, {
      recipient: { id: igsid },
      message: { text: text.slice(0, 990) },
    });
  } catch (error) {
    console.error('[instagram] Failed to send DM:', {
      igsid,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export interface MentionedComment {
  text: string;
  username: string | null;
  mediaId: string | null;
}

export interface MentionedMedia {
  caption: string | null;
  permalink: string | null;
  mediaType: string | null;
  username: string | null;
}

export const fetchMentionedComment = async (commentId: string): Promise<MentionedComment | null> => {
  if (!isInstagramMessagingConfigured() || !commentId) return null;
  try {
    const data = await graphGet<{
      mentioned_comment?: {
        text?: string;
        username?: string;
        media?: { id?: string };
      };
    }>(
      `${igUserId()}?fields=${encodeURIComponent(
        `mentioned_comment.comment_id(${commentId}){text,username,timestamp,media}`,
      )}`,
    );
    const comment = data.mentioned_comment;
    if (!comment) return null;
    return {
      text: String(comment.text || '').trim(),
      username: comment.username ? String(comment.username) : null,
      mediaId: comment.media?.id ? String(comment.media.id) : null,
    };
  } catch (error) {
    console.error('[instagram] mentioned_comment failed:', error);
    return null;
  }
};

export const fetchMentionedMedia = async (mediaId: string): Promise<MentionedMedia | null> => {
  if (!isInstagramMessagingConfigured() || !mediaId) return null;
  try {
    const data = await graphGet<{
      mentioned_media?: {
        caption?: string;
        permalink?: string;
        media_type?: string;
        username?: string;
      };
    }>(
      `${igUserId()}?fields=${encodeURIComponent(
        `mentioned_media.media_id(${mediaId}){caption,media_type,media_url,permalink,timestamp,username}`,
      )}`,
    );
    const media = data.mentioned_media;
    if (!media) return null;
    return {
      caption: media.caption ? String(media.caption) : null,
      permalink: media.permalink ? String(media.permalink) : null,
      mediaType: media.media_type ? String(media.media_type) : null,
      username: media.username ? String(media.username) : null,
    };
  } catch (error) {
    console.error('[instagram] mentioned_media failed:', error);
    return null;
  }
};
