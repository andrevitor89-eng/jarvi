/**
 * Meta Instagram webhook: hub.challenge on GET, signed JSON on POST.
 * Enqueues DM and mention events; does not run the agent inline.
 */
import { Request, Response } from 'express';
import {
  isInstagramWebhookConfigured,
  verifyInstagramSignature,
} from '../services/instagramService';
import {
  enqueueInstagramEvent,
  processInstagramEventDirect,
  type InstagramInboundEvent,
} from '../queues/instagramQueue';

interface MessagingAttachment {
  type?: string;
  payload?: { url?: string };
}

interface MessagingItem {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    attachments?: MessagingAttachment[];
    is_echo?: boolean;
  };
}

interface ChangeItem {
  field?: string;
  value?: {
    comment_id?: string;
    media_id?: string;
    id?: string;
    text?: string;
    from?: { id?: string; username?: string };
    media?: { id?: string };
  };
}

interface EntryItem {
  id?: string;
  time?: number;
  messaging?: MessagingItem[];
  changes?: ChangeItem[];
}

const collectEvents = (body: unknown): InstagramInboundEvent[] => {
  const events: InstagramInboundEvent[] = [];
  if (!body || typeof body !== 'object') return events;
  const payload = body as { object?: string; entry?: EntryItem[] };
  if (payload.object && payload.object !== 'instagram') return events;
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    for (const item of entry.messaging || []) {
      if (item.message?.is_echo) continue;
      const senderIgsid = String(item.sender?.id || '').trim();
      if (!senderIgsid) continue;
      const text = String(item.message?.text || '').trim();
      const shareUrl =
        item.message?.attachments?.find((a) => a.payload?.url)?.payload?.url || null;
      if (!text && !shareUrl) continue;
      const mid = item.message?.mid ? String(item.message.mid) : null;
      events.push({
        kind: 'message',
        eventId: mid || `msg:${senderIgsid}:${item.timestamp || Date.now()}`,
        senderIgsid,
        text,
        shareUrl,
        mid,
      });
    }

    for (const change of entry.changes || []) {
      const field = String(change.field || '');
      if (field !== 'mentions' && field !== 'comments') continue;
      const value = change.value || {};
      const commentId = String(value.comment_id || value.id || '').trim();
      const mediaId = String(value.media_id || value.media?.id || '').trim();
      const senderIgsid = String(value.from?.id || '').trim();
      const senderUsername = value.from?.username ? String(value.from.username) : null;
      const text = String(value.text || '').trim();
      if (!commentId && !mediaId) continue;
      events.push({
        kind: 'mention',
        eventId: commentId || `mention:${mediaId}:${entry.time || Date.now()}`,
        senderIgsid,
        senderUsername,
        text,
        shareUrl: null,
        mid: null,
        commentId: commentId || null,
        mediaId: mediaId || null,
      });
    }
  }

  return events;
};

export const verifySubscription = (req: Request, res: Response): void => {
  if (!isInstagramWebhookConfigured()) {
    res.status(503).json({ error: 'Instagram webhook not configured' });
    return;
  }
  const mode = String(req.query['hub.mode'] || '');
  const token = String(req.query['hub.verify_token'] || '');
  const challenge = String(req.query['hub.challenge'] || '');
  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN?.trim() && challenge) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
};

export const receiveEvent = async (req: Request, res: Response): Promise<void> => {
  if (!isInstagramWebhookConfigured()) {
    res.status(503).json({ error: 'Instagram webhook not configured' });
    return;
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const signature = req.headers['x-hub-signature-256'];
  const signatureValue = Array.isArray(signature) ? signature[0] : signature;
  if (!rawBody || !verifyInstagramSignature(rawBody, signatureValue)) {
    res.sendStatus(401);
    return;
  }

  res.sendStatus(200);

  const events = collectEvents(req.body);
  void (async () => {
    for (const event of events) {
      try {
        await enqueueInstagramEvent(event);
      } catch (queueError) {
        console.error('[instagram] enqueue failed, processing direct:', {
          eventId: event.eventId,
          error: queueError instanceof Error ? queueError.message : String(queueError),
        });
        await processInstagramEventDirect(event);
      }
    }
  })();
};
