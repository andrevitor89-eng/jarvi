/**
 * AppsPage - SettingsDialog
 *
 * Apps tab: integrations list + per-app connection sub-pages.
 * WhatsApp and Instagram are available; remaining apps stay disabled.
 *
 * Figma: https://figma.com/design/TM2wS5y3DkyW9bvfP7xzHK/JarviDS-App
 * Nodes: 40001780-29397 (list), 40001302-3829 / 40001305-4219 / 40001305-4296 (WA flow)
 */

import { useEffect, useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { Button, Input } from '../../../../ui';
import { useAuth } from '../../../../../contexts/AuthContext';
import styles from './AppsPage.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

const APPS: AppDefinition[] = [
  {
    id: 'whatsapp',
    name: 'Whatsapp',
    description: 'Interaja com a Jarvi no seu whatsapp.',
    icon: '/icons/apps/whatsapp.svg',
    available: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Mande um Direct ou marque @jarvi.life para criar tarefas.',
    icon: '/icons/apps/instagram.svg',
    available: true,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Deixe a Jarvi te ajudar com seus emails do Google.',
    icon: '/icons/apps/gmail.svg',
    available: false,
  },
  {
    id: 'outlook-mail',
    name: 'Outlook Mail',
    description: 'Deixe a Jarvi te ajudar com seus emails do Outlook.',
    icon: '/icons/apps/outlook.svg',
    available: false,
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Compartilhe sua agenda do Google com a Jarvi.',
    icon: '/icons/apps/google-calendar.svg',
    available: false,
  },
  {
    id: 'alexa',
    name: 'Alexa',
    description: 'Use a Alexa para conversar com a Jarvi.',
    icon: '/icons/apps/alexa.svg',
    available: false,
  },
  {
    id: 'siri',
    name: 'Siri',
    description: 'Use a Siri para conversar com a Jarvi.',
    icon: '/icons/apps/siri.png',
    available: false,
  },
];

// ============================================================================
// HELPERS
// ============================================================================

const parseApiPayload = async (response: Response): Promise<Record<string, unknown>> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<Record<string, unknown>>;
  }
  const rawText = await response.text();
  if (!rawText) return {};
  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return { error: rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() };
  }
};

// ============================================================================
// ROOT: VIEW CONTROLLER
// ============================================================================

type AppsView = 'list' | 'whatsapp' | 'instagram' | 'gmail';

export function AppsPage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const [view, setView] = useState<AppsView>('list');

  if (view === 'whatsapp') {
    return <WhatsAppConnectPage onBack={() => setView('list')} />;
  }
  if (view === 'instagram') {
    return <InstagramConnectPage onBack={() => setView('list')} />;
  }
  if (view === 'gmail') {
    return <GmailConnectPage onBack={() => setView('list')} />;
  }
  return (
    <AppsList
      hideHeader={hideHeader}
      onConnect={(appId) => {
        if (appId === 'whatsapp') setView('whatsapp');
        else if (appId === 'instagram') setView('instagram');
        else if (appId === 'gmail') setView('gmail');
      }}
    />
  );
}

// ============================================================================
// APPS LIST VIEW
// ============================================================================

interface AppsListProps {
  onConnect: (appId: string) => void;
  hideHeader?: boolean;
}

function AppsList({ onConnect, hideHeader = false }: AppsListProps) {
  const { token } = useAuth();
  const [linkedApps, setLinkedApps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [whatsappRes, instagramRes] = await Promise.all([
          fetch(`${API_URL}/api/users/whatsapp-link`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/users/instagram-link`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const whatsappData = await parseApiPayload(whatsappRes);
        const instagramData = await parseApiPayload(instagramRes);
        if (cancelled) return;
        setLinkedApps({
          whatsapp: Boolean(whatsappData.linked),
          instagram: Boolean(instagramData.linked),
        });
      } catch {
        // keep default "Conectar" labels
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <>
      {!hideHeader && (
        <div className={styles.listHeader}>
          <h1 className={styles.pageTitle}>Apps</h1>
          <p className={styles.pageSubtitle}>Gerencie os aplicativos conectados à sua conta.</p>
        </div>
      )}

      <ul className={styles.integrationList}>
        {APPS.map((app) => {
          const linked = Boolean(linkedApps[app.id]);
          const actionLabel = linked ? 'Gerenciar' : 'Conectar';
          return (
            <li key={app.id} className={styles.integrationRow}>
            <div className={styles.integrationInfo}>
              <div className={styles.iconContainer}>
                <img
                  src={app.icon}
                  alt={app.name}
                  className={styles.appIcon}
                  draggable={false}
                />
              </div>
              <div className={styles.integrationDetails}>
                <p className={styles.integrationName}>{app.name}</p>
                <p className={styles.integrationDescription}>{app.description}</p>
              </div>
            </div>

            <div className={styles.integrationActions}>
              <Button
                variant="secondary"
                size="small"
                disabled={!app.available}
                onClick={() => onConnect(app.id)}
                aria-label={
                  app.available
                    ? `${actionLabel} ${app.name}`
                    : `${app.name} ainda não está disponível`
                }
              >
                {app.available ? actionLabel : 'Conectar'}
              </Button>
            </div>
          </li>
          );
        })}
      </ul>
    </>
  );
}

// ============================================================================
// WHATSAPP CONNECTION SUB-PAGE
// ============================================================================

type WhatsAppState = 'initial' | 'awaitingCode' | 'connected';

interface WhatsAppConnectPageProps {
  onBack: () => void;
}

function WhatsAppConnectPage({ onBack }: WhatsAppConnectPageProps) {
  const { token } = useAuth();

  const [whatsappState, setWhatsappState] = useState<WhatsAppState>('initial');
  const [phone, setPhone] = useState('');
  const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  const [statusLoading, setStatusLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearFeedback = () => {
    setError('');
    setSuccessMsg('');
  };

  // Load current WhatsApp link status on mount
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      setStatusLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/users/whatsapp-link`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await parseApiPayload(res);
        if (!res.ok) return;
        if (cancelled) return;

        const fetchedPhone = typeof data.phone === 'string' ? data.phone : '';
        setLinkedPhone(fetchedPhone || null);
        setPhone(fetchedPhone);

        if (data.linked) {
          setWhatsappState('connected');
        } else if (data.awaitingCode) {
          setWhatsappState('awaitingCode');
        } else {
          setWhatsappState('initial');
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Send verification code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setRequestLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/whatsapp-link/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });
      const data = await parseApiPayload(res);
      if (!res.ok) throw new Error(String(data.error || 'Erro ao enviar código de verificação'));

      setSuccessMsg(String(data.message || 'Código enviado com sucesso.'));
      setLinkedPhone(typeof data.phone === 'string' ? data.phone : phone);
      setWhatsappState('awaitingCode');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar código');
    } finally {
      setRequestLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    clearFeedback();
    setRequestLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/whatsapp-link/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });
      const data = await parseApiPayload(res);
      if (!res.ok) throw new Error(String(data.error || 'Erro ao reenviar código'));
      setSuccessMsg(String(data.message || 'Código reenviado com sucesso.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reenviar código');
    } finally {
      setRequestLoading(false);
    }
  };

  // Confirm verification code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setVerifyLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/whatsapp-link/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await parseApiPayload(res);
      if (!res.ok) throw new Error(String(data.error || 'Erro ao validar código'));

      setSuccessMsg(String(data.message || 'WhatsApp vinculado com sucesso.'));
      setLinkedPhone(typeof data.phone === 'string' ? data.phone : linkedPhone);
      setVerificationCode('');
      setWhatsappState('connected');
      window.dispatchEvent(
        new CustomEvent('jarvi:whatsapp-link-changed', { detail: { linked: true } })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao validar código');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Unlink WhatsApp
  const handleUnlink = async () => {
    clearFeedback();
    setUnlinkLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/whatsapp-link`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await parseApiPayload(res);
      if (!res.ok) throw new Error(String(data.error || 'Erro ao desvincular WhatsApp'));

      setSuccessMsg(String(data.message || 'WhatsApp desvinculado com sucesso.'));
      setLinkedPhone(null);
      setPhone('');
      setVerificationCode('');
      setWhatsappState('initial');
      window.dispatchEvent(
        new CustomEvent('jarvi:whatsapp-link-changed', { detail: { linked: false } })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desvincular WhatsApp');
    } finally {
      setUnlinkLoading(false);
    }
  };

  return (
    <div className={styles.subPageWrapper}>
      {/* Back navigation */}
      <button type="button" className={styles.backLink} onClick={onBack}>
        <ArrowLeft size={16} weight="regular" />
        Apps
      </button>

      {/* App identity header */}
      <div className={styles.subPageAppHeader}>
        <div className={styles.iconContainer}>
          <img
            src="/icons/apps/whatsapp.svg"
            alt="WhatsApp"
            className={styles.appIcon}
            draggable={false}
          />
        </div>
        <h1 className={styles.subPageAppName}>Whatsapp</h1>
      </div>

      <p className={styles.pageSubtitle}>Gerencie os aplicativos conectados à sua conta.</p>

      {/* Feedback */}
      {statusLoading && <p className={styles.pageSubtitle}>Carregando...</p>}
      {error && <p className={styles.feedbackError}>{error}</p>}
      {successMsg && <p className={styles.feedbackSuccess}>{successMsg}</p>}

      {/* ── INITIAL STATE ─────────────────────────────────────────── */}
      {whatsappState === 'initial' && (
        <form className={styles.formSection} onSubmit={handleRequestCode}>
          <div>
            <label className={styles.fieldLabel} htmlFor="wa-phone-initial">
              Número do WhatsApp
            </label>
            <div className={styles.inputRow}>
              <Input
                id="wa-phone-initial"
                name="phone"
                type="tel"
                placeholder="+551199999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                showLabel={false}
                required
              />
              <Button
                type="submit"
                variant="primary"
                loading={requestLoading}
                disabled={requestLoading}
              >
                Enviar Código
              </Button>
            </div>
            <p className={styles.helperText}>Use DDI + DDD + número</p>
          </div>
        </form>
      )}

      {/* ── AWAITING CODE STATE ────────────────────────────────────── */}
      {whatsappState === 'awaitingCode' && (
        <form className={styles.formSection} onSubmit={handleVerifyCode}>
          <div>
            <label className={styles.fieldLabel} htmlFor="wa-phone-await">
              Número do WhatsApp
            </label>
            <div className={styles.inputRow}>
              <Input
                id="wa-phone-await"
                name="phone"
                type="tel"
                placeholder="+551199999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                showLabel={false}
              />
              <Button
                type="button"
                variant="secondary"
                loading={requestLoading}
                disabled={requestLoading}
                onClick={handleResendCode}
              >
                Renviar Código
              </Button>
            </div>
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="wa-code">
              Código de verificação
            </label>
            <div className={styles.inputRow}>
              <Input
                id="wa-code"
                name="code"
                type="text"
                placeholder="Digite o código de 6 dígitos"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                showLabel={false}
                required
              />
              <Button
                type="submit"
                variant="primary"
                loading={verifyLoading}
                disabled={verifyLoading}
              >
                Confirmar
              </Button>
            </div>
            <p className={styles.helperText}>Use DDI + DDD + número</p>
          </div>
        </form>
      )}

      {/* ── CONNECTED STATE ────────────────────────────────────────── */}
      {whatsappState === 'connected' && (
        <div className={styles.formSection}>
          <div className={styles.connectedRow}>
            <span className={styles.connectedBadge}>Conectado</span>
            <p className={styles.connectedPhone}>{linkedPhone}</p>
            <div className={styles.connectedActions}>
              <Button
                variant="secondary"
                loading={unlinkLoading}
                disabled={unlinkLoading}
                onClick={handleUnlink}
              >
                Desvincular número
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INSTAGRAM CONNECTION SUB-PAGE
// ============================================================================

type InstagramState = 'initial' | 'awaitingCode' | 'connected';

interface InstagramConnectPageProps {
  onBack: () => void;
}

function InstagramConnectPage({ onBack }: InstagramConnectPageProps) {
  const { token } = useAuth();

  const [instagramState, setInstagramState] = useState<InstagramState>('initial');
  const [linkedUsername, setLinkedUsername] = useState<string | null>(null);
  const [linkCodeDisplay, setLinkCodeDisplay] = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearFeedback = () => {
    setError('');
    setSuccessMsg('');
    setCopySuccess(false);
  };

  const applyStatus = (data: Record<string, unknown>) => {
    const username =
      typeof data.username === 'string' && data.username.trim() ? data.username.trim() : null;
    const display =
      typeof data.linkCodeDisplay === 'string' && data.linkCodeDisplay.trim()
        ? data.linkCodeDisplay.trim()
        : null;

    setLinkedUsername(username);

    if (data.linked) {
      setInstagramState('connected');
      setLinkCodeDisplay(null);
      return;
    }

    if (data.awaitingCode && display) {
      setInstagramState('awaitingCode');
      setLinkCodeDisplay(display);
      return;
    }

    setInstagramState('initial');
    setLinkCodeDisplay(null);
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      setStatusLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/users/instagram-link`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await parseApiPayload(res);
        if (!res.ok || cancelled) return;
        applyStatus(data);
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || instagramState !== 'awaitingCode') return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/instagram-link`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await parseApiPayload(res);
        if (!res.ok || cancelled) return;
        if (data.linked) {
          applyStatus(data);
          setSuccessMsg('Instagram vinculado com sucesso.');
        }
      } catch {
        // keep waiting; the next poll retries
      }
    };

    const intervalId = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [token, instagramState]);

  const handleRequestCode = async () => {
    clearFeedback();
    setRequestLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/instagram-link/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await parseApiPayload(res);
      if (!res.ok) throw new Error(String(data.error || 'Erro ao gerar código'));

      const display =
        typeof data.linkCodeDisplay === 'string' && data.linkCodeDisplay.trim()
          ? data.linkCodeDisplay.trim()
          : null;
      setLinkCodeDisplay(display);
      setInstagramState('awaitingCode');
      setSuccessMsg(String(data.message || 'Mande este código no Direct da @jarvi.life.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar código');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!linkCodeDisplay) return;
    try {
      await navigator.clipboard.writeText(linkCodeDisplay);
      setCopySuccess(true);
      setError('');
    } catch {
      setCopySuccess(false);
      setError('Não foi possível copiar o código.');
    }
  };

  const handleUnlink = async () => {
    clearFeedback();
    setUnlinkLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/instagram-link`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await parseApiPayload(res);
      if (!res.ok) throw new Error(String(data.error || 'Erro ao desvincular Instagram'));

      setSuccessMsg(String(data.message || 'Vinculação do Instagram removida.'));
      setLinkedUsername(null);
      setLinkCodeDisplay(null);
      setInstagramState('initial');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desvincular Instagram');
    } finally {
      setUnlinkLoading(false);
    }
  };

  return (
    <div className={styles.subPageWrapper}>
      <button type="button" className={styles.backLink} onClick={onBack}>
        <ArrowLeft size={16} weight="regular" />
        Apps
      </button>

      <div className={styles.subPageAppHeader}>
        <div className={styles.iconContainer}>
          <img
            src="/icons/apps/instagram.svg"
            alt="Instagram"
            className={styles.appIcon}
            draggable={false}
          />
        </div>
        <h1 className={styles.subPageAppName}>Instagram</h1>
      </div>

      <p className={styles.pageSubtitle}>
        Ligue sua conta para criar tarefas pelo Direct ou marcando @jarvi.life em um comentário.
      </p>

      {statusLoading && <p className={styles.pageSubtitle}>Carregando...</p>}
      {error && <p className={styles.feedbackError}>{error}</p>}
      {successMsg && <p className={styles.feedbackSuccess}>{successMsg}</p>}

      {instagramState === 'initial' && !statusLoading && (
        <div className={styles.formSection}>
          <Button
            type="button"
            variant="primary"
            loading={requestLoading}
            disabled={requestLoading}
            onClick={() => {
              void handleRequestCode();
            }}
          >
            Gerar código
          </Button>
          <p className={styles.helperText}>
            Depois mande o código no Direct da @jarvi.life. Expira em 15 minutos.
          </p>
        </div>
      )}

      {instagramState === 'awaitingCode' && (
        <div className={styles.formSection}>
          <div>
            <p className={styles.fieldLabel}>Código para o Direct</p>
            <p className={styles.ligaCode}>{linkCodeDisplay || 'LIGA ······'}</p>
            <p className={styles.helperText}>
              Mande exatamente este texto no Direct da @jarvi.life. Esta tela atualiza sozinha
              quando o vínculo completar.
            </p>
          </div>
          <div className={styles.inputRow}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void handleCopyCode();
              }}
              disabled={!linkCodeDisplay}
            >
              {copySuccess ? 'Copiado' : 'Copiar código'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={requestLoading}
              disabled={requestLoading}
              onClick={() => {
                void handleRequestCode();
              }}
            >
              Gerar outro
            </Button>
          </div>
        </div>
      )}

      {instagramState === 'connected' && (
        <div className={styles.formSection}>
          <div className={styles.connectedRow}>
            <span className={styles.connectedBadge}>Conectado</span>
            <p className={styles.connectedPhone}>
              {linkedUsername ? `@${linkedUsername.replace(/^@/, '')}` : 'Instagram'}
            </p>
            <div className={styles.connectedActions}>
              <Button
                variant="secondary"
                loading={unlinkLoading}
                disabled={unlinkLoading}
                onClick={() => {
                  void handleUnlink();
                }}
              >
                Desvincular
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GMAIL CONNECTION SUB-PAGE
// ============================================================================

interface GmailConnectPageProps {
  onBack: () => void;
}

function GmailConnectPage({ onBack }: GmailConnectPageProps) {
  const { token } = useAuth();

  const [connected, setConnected] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [resyncLoading, setResyncLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearFeedback = () => {
    setError('');
    setSuccessMsg('');
  };

  // Check connection status on mount and when returning from OAuth redirect
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const checkStatus = async () => {
      setStatusLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/gmail/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await parseApiPayload(res);
        if (cancelled) return;
        setConnected(Boolean(data.connected));

        // Handle query params set by the OAuth callback redirect
        const params = new URLSearchParams(window.location.search);
        const gmailParam = params.get('gmail');
        if (gmailParam === 'connected') {
          setSuccessMsg('Gmail conectado com sucesso!');
          setConnected(true);
          // Clean up URL
          const url = new URL(window.location.href);
          url.searchParams.delete('gmail');
          window.history.replaceState({}, '', url.toString());
        } else if (gmailParam === 'error') {
          const reason = params.get('reason') ?? 'unknown';
          setError(`Falha ao conectar Gmail: ${reason}`);
          const errorUrl = new URL(window.location.href);
          errorUrl.searchParams.delete('gmail');
          errorUrl.searchParams.delete('reason');
          window.history.replaceState({}, '', errorUrl.toString());
        }
      } catch (err) {
        if (!cancelled) setError('Erro ao verificar status do Gmail');
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    };

    void checkStatus();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleConnect = async () => {
    clearFeedback();
    setConnectLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/gmail/connect`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiPayload(res);
      if (!res.ok) throw new Error(String(data.error || 'Erro ao iniciar conexão com Gmail'));
      const url = typeof data.url === 'string' ? data.url : '';
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar Gmail');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDisconnect = async () => {
    clearFeedback();
    setDisconnectLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/gmail/disconnect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiPayload(res);
      if (!res.ok) throw new Error(String(data.error || 'Erro ao desconectar Gmail'));
      setConnected(false);
      setSuccessMsg('Gmail desconectado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desconectar Gmail');
    } finally {
      setDisconnectLoading(false);
    }
  };

  const handleSyncNow = async () => {
    clearFeedback();
    setSyncLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/gmail/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiPayload(res);
      if (!res.ok) throw new Error(String(data.error || 'Erro ao sincronizar emails'));
      const created = typeof data.created === 'number' ? data.created : 0;
      const analyzed = typeof data.analyzed === 'number' ? data.analyzed : 0;
      setSuccessMsg(
        created > 0
          ? `${created} tarefa(s) sugerida(s) a partir de ${analyzed} email(s) analisado(s).`
          : `${analyzed} email(s) analisado(s). Nenhuma ação necessária encontrada.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar emails');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleResync = async () => {
    clearFeedback();
    setResyncLoading(true);
    try {
      // Clear processed history first so all emails are re-analyzed
      await fetch(`${API_URL}/api/gmail/processed`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      // Then run a fresh sync
      const res = await fetch(`${API_URL}/api/gmail/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiPayload(res);
      if (!res.ok) throw new Error(String(data.error || 'Erro ao re-sincronizar emails'));
      const created = typeof data.created === 'number' ? data.created : 0;
      const analyzed = typeof data.analyzed === 'number' ? data.analyzed : 0;
      setSuccessMsg(
        created > 0
          ? `${created} tarefa(s) sugerida(s) a partir de ${analyzed} email(s) analisado(s).`
          : `${analyzed} email(s) analisado(s). Nenhuma ação necessária encontrada.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao re-sincronizar emails');
    } finally {
      setResyncLoading(false);
    }
  };

  return (
    <div className={styles.subPageWrapper}>
      {/* Back navigation */}
      <button type="button" className={styles.backLink} onClick={onBack}>
        <ArrowLeft size={16} weight="regular" />
        Apps
      </button>

      {/* App identity header */}
      <div className={styles.subPageAppHeader}>
        <div className={styles.iconContainer}>
          <img
            src="/icons/apps/gmail.svg"
            alt="Gmail"
            className={styles.appIcon}
            draggable={false}
          />
        </div>
        <h1 className={styles.subPageAppName}>Gmail</h1>
      </div>

      <p className={styles.pageSubtitle}>
        Conecte seu Gmail para que a Jarvi identifique emails que precisam de ação e os transforme
        em tarefas automaticamente.
      </p>

      {/* Feedback */}
      {statusLoading && <p className={styles.pageSubtitle}>Carregando...</p>}
      {error && <p className={styles.feedbackError}>{error}</p>}
      {successMsg && <p className={styles.feedbackSuccess}>{successMsg}</p>}

      {/* ── NOT CONNECTED ─────────────────────────────────────────── */}
      {!statusLoading && !connected && (
        <div className={styles.formSection}>
          <Button
            variant="primary"
            loading={connectLoading}
            disabled={connectLoading}
            onClick={handleConnect}
          >
            Conectar com Google
          </Button>
          <p className={styles.helperText}>
            Você será redirecionado para autenticação do Google. Jarvi solicitará apenas acesso de
            leitura aos seus emails.
          </p>
        </div>
      )}

      {/* ── CONNECTED ─────────────────────────────────────────────── */}
      {!statusLoading && connected && (
        <div className={styles.formSection}>
          <div className={styles.connectedRow}>
            <span className={styles.connectedBadge}>Conectado</span>
            <div className={styles.connectedActions}>
              <Button
                variant="secondary"
                loading={syncLoading}
                disabled={syncLoading || resyncLoading || disconnectLoading}
                onClick={handleSyncNow}
              >
                Sincronizar novos
              </Button>
              <Button
                variant="secondary"
                loading={resyncLoading}
                disabled={resyncLoading || syncLoading || disconnectLoading}
                onClick={handleResync}
              >
                Re-analisar tudo
              </Button>
              <Button
                variant="secondary"
                loading={disconnectLoading}
                disabled={disconnectLoading || syncLoading || resyncLoading}
                onClick={handleDisconnect}
              >
                Desconectar
              </Button>
            </div>
          </div>
          <p className={styles.helperText}>
            "Sincronizar novos" analisa apenas emails ainda não verificados. "Re-analisar tudo" refaz a análise dos últimos 3 dias completos.
          </p>
        </div>
      )}
    </div>
  );
}
