import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Input, Logo, OtpInput } from '../../components/ui';
import { useForceTheme } from '../../hooks/useForceTheme';
import { trackRegistrationCompleted } from '../../lib/openaiPixel';
import {
  clearPendingEmail,
  persistPendingEmail,
  readStoredPendingEmail,
  resolvePendingEmail,
  verifyPendingPath,
} from '../../lib/pendingEmail';
import styles from './VerifyPending.module.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const VerifyPending: React.FC = () => {
  useForceTheme('light');

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const lastSubmittedCodeRef = useRef<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(() =>
    resolvePendingEmail({
      search: location.search,
      state: location.state as { email?: unknown } | null,
      storage: readStoredPendingEmail(),
    }),
  );

  useEffect(() => {
    if (!email) return;
    persistPendingEmail(email);
    const expectedPath = verifyPendingPath(email);
    if (`${location.pathname}${location.search}` !== expectedPath) {
      navigate(expectedPath, { replace: true, state: { email } });
    }
  }, [email, location.pathname, location.search, navigate]);

  const handleVerifyCode = async (overrideCode?: string) => {
    if (!email) {
      setError('Informe o email usado no cadastro para validar o código.');
      return;
    }

    const normalizedCode = (overrideCode ?? code).replace(/\D/g, '').slice(0, 6);
    if (normalizedCode.length !== 6) {
      setError('Digite o código de 6 dígitos');
      return;
    }

    if (isVerifying) return;
    if (lastSubmittedCodeRef.current === normalizedCode) return;
    lastSubmittedCodeRef.current = normalizedCode;

    setIsVerifying(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code: normalizedCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar código');
      }

      trackRegistrationCompleted(data.user?.id ? `cr_${data.user.id}` : undefined);

      if (data.token) {
        clearPendingEmail();
        localStorage.setItem('jarvi_token', data.token);
        window.location.href = '/tasks';
        return;
      }

      setVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar código');
      lastSubmittedCodeRef.current = null;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setError('Informe o email usado no cadastro para reenviar o código.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao reenviar email');
      }

      setMessage('Código de verificação reenviado com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reenviar email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleUseAnotherEmail = () => {
    clearPendingEmail();
    navigate('/criar-conta');
  };

  const handleEmailSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextEmail = emailDraft.trim();
    if (!nextEmail) {
      setError('Digite o email usado no cadastro.');
      return;
    }
    setError('');
    persistPendingEmail(nextEmail);
    setEmail(nextEmail);
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <Logo className={styles.logo} />

        <div className={styles.content}>
          <h1 className={styles.title}>Verifique seu email</h1>

          {email ? (
            <p className={styles.description}>
              Enviamos um código de verificação para{' '}
              <span className={styles.email}>{email}</span>
              . Digite o código abaixo para ativar sua conta.
            </p>
          ) : (
            <p className={styles.description}>
              Não encontramos o email desta verificação. Informe o endereço usado no cadastro para continuar.
            </p>
          )}

          {message && <div className={styles.success}>{message}</div>}
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            {!email && (
              <form className={styles.emailForm} onSubmit={handleEmailSubmit}>
                <Input
                  type="email"
                  name="email"
                  placeholder="seu@email.com"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  showLabel={false}
                  autoComplete="email"
                />
                <Button type="submit" variant="primary" size="medium" fullWidth>
                  Continuar
                </Button>
              </form>
            )}

            {email && !verified && (
              <OtpInput
                value={code}
                onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                length={6}
                disabled={isVerifying}
                error={!!error}
                onComplete={(v) => handleVerifyCode(v)}
              />
            )}

            {verified && (
              <Button
                variant="primary"
                size="medium"
                fullWidth
                onClick={handleBackToLogin}
              >
                Ir para o login
              </Button>
            )}

            {email && (
              <Button
                variant="secondary"
                size="medium"
                fullWidth
                onClick={handleResendEmail}
                disabled={isLoading || isVerifying}
                loading={isLoading}
              >
                Reenviar código
              </Button>
            )}

            <div className={styles.inlineLink}>
              {email && (
                <button
                  type="button"
                  className={styles.footerLink}
                  onClick={handleUseAnotherEmail}
                >
                  Usar outro email
                </button>
              )}
              <button
                type="button"
                className={styles.footerLink}
                onClick={handleBackToLogin}
              >
                Voltar ao login
              </button>
            </div>
          </div>

          <div className={styles.footer}>
            <span>Não recebeu o email? Verifique sua pasta de spam.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPending;
