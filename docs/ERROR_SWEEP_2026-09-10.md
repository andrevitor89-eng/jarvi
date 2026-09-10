# Varredura de erros — 2026-09-10

Documento para um agente Cursor **implementar depois**. Este PR é só o relatório: **não alterar código de produto aqui**.

Não substitui o plano de 02/09 ([PR #3](https://github.com/andrevitor89-eng/jarvi/pull/3) / `docs/QA_FIX_PLAN.md` nessa branch). Revalida o que ainda está vivo e acrescenta o que esta sessão viu.

---

## Headline

**4 P0 reconfirmados ao vivo / 4 P0 do plano 02/09 ainda no código (auth não testada) / 1 drift prod vs `main` / 0 erros `tsc` / PostHog: bloqueado.**

| Fonte | Resultado |
|-------|-----------|
| A — PostHog produção | **Bloqueado.** MCP PostHog não está ligado nesta sessão. Sem lista de `$exception`. Não inventar issues. |
| B — QA ao vivo | `https://jarvi.life` e `https://app.jarvi.life` (superfícies públicas). Checkpoint Vercel passou no browser; `curl` no app recebe 429. **Sem login autenticado** (sem credenciais). |
| C — Estático | `npx tsc --noEmit` em `packages/backend`, `packages/web`, `packages/marketing` depois de `npm run build:shared`: **exit 0**. ESLint não usado (config quebrada). |

---

## 0. Contexto

| Item | Valor |
|------|--------|
| Data | 2026-09-10 |
| Marketing | `https://jarvi.life` → `packages/marketing` |
| App | `https://app.jarvi.life` → `packages/web` |
| Checkout git | `main` em `andrevitor89-eng/jarvi` @ `9ac37c3` |
| Conta autenticada | **Não.** Sem senha da conta QA. Não criar user real nem disparar WhatsApp. |
| PR #1 | [OPEN, não merged](https://github.com/andrevitor89-eng/jarvi/pull/1) — bugs 1–18 de agosto |
| PR #3 | [OPEN, docs](https://github.com/andrevitor89-eng/jarvi/pull/3) — plano ao vivo 02/09 |

### Drift produção vs este `main` (ler antes de implementar)

O login **ao vivo** em `app.jarvi.life/login` é **WhatsApp-first** (“Login com whatsapp”, campo de telefone +55, links “Criar conta” e “Fazer login com email”).

Neste checkout, [`packages/web/src/pages/Login/index.tsx`](../packages/web/src/pages/Login/index.tsx) é **email + Google**. A string `Login com whatsapp` **não existe** no repo.

Conclusão: o que o usuário vê em produção **não é só este `main`**. Rotas em branco (`/calendar`, catch-all) batem com este código **e** com o live — esses P0 são seguros. Qualquer fix de auth/onboarding tem de conferir o código que a Vercel realmente faz deploy, não só este clone.

### Doutrina (quando for implementar)

1. [`packages/web/compliance.md`](../packages/web/compliance.md) — nunca dois `Dialog` empilhados.
2. [`docs/decisions/0001-one-overlay.md`](decisions/0001-one-overlay.md).
3. Voz PT-BR, produto **a Jarvi**.
4. Gate estático: `tsc --noEmit` em backend/web (depois de `build:shared` se mexer em shared). Não usar ESLint.
5. **Não** mergear o PR #1 inteiro. Reimplementar no `main` atual só o que ainda bate com a lista abaixo.

---

## 1. Fonte A — PostHog

**Status: bloqueado.**

Nesta sessão o catálogo MCP não inclui tools `posthog:*` (`query-error-tracking-issues-list`, Inbox, `execute-sql`). Sem project API.

O app inicializa PostHog em [`packages/web/src/main.tsx`](../packages/web/src/main.tsx) (`api_host: '/ingest'`) e filtra ruído de in-app browser em [`dropInAppBrowserExceptions.ts`](../packages/web/src/lib/dropInAppBrowserExceptions.ts). **Não há `capture_exceptions` / `posthog.captureException`.** Exceptions no PostHog, se existirem, são só unhandled (default do SDK) — cobertura incompleta.

Backend [`posthogService.ts`](../packages/backend/src/services/posthogService.ts) captura eventos de ciclo de vida, **não** exceptions de `errorHandler`.

**Próximo passo (não nesta rodada):** ligar o MCP PostHog e repetir a triagem `-7d` / `-24h` por `users`. Até lá, não priorizar “top errors de produção” a partir de chute.

---

## 2. Fonte B — QA ao vivo (público)

### Marketing — `jarvi.life`

| URL | Resultado | Notas |
|-----|-----------|--------|
| `/` | OK | Headline “Assistente de tarefas com IA que funciona no WhatsApp”. CTA “Criar conta” / “Criar conta grátis”. **Sem cookie banner.** |
| CTA Criar conta | OK | Destino **`app.jarvi.life/criar-conta`** (atribuição via [`appLinks.ts`](../packages/marketing/app/lib/appLinks.ts)). |
| `/criar-conta` (URL direta) | **404** custom | “Página não encontrada”. **Não redireciona** para o app. |
| `/politica-de-privacidade` | OK | Página legal real. |
| `/termos-de-uso` | OK | Página legal real. |
| `/lgpd`, `/privacidade`, `/termos` | **404** custom | Sem redirect. PR #1 reivindicava esses aliases. |
| `/pagina-que-nao-existe-xyz` | 404 custom | Marketing 404 **funciona**. |

[`next.config.mjs`](../packages/marketing/next.config.mjs) não tem `redirects()` para `/criar-conta` nem aliases legais.

### App — `app.jarvi.life`

| URL | Resultado | Notas |
|-----|-----------|--------|
| `/login` | OK (UI) | WhatsApp-first **em produção** (drift vs `main`). Checkpoint Vercel ~5s no browser; `curl` = 429 Security Checkpoint. |
| `/criar-conta` | OK (UI) | Formulário de signup carrega. |
| `/verify-pending` | **email ausente** | “Enviamos um código… para **seu email**” — sem endereço. F5 não mostra o toast “Email não encontrado” (só dispara no submit/reenvio), mas o email **já não está na página**. |
| `/forgot-password` | OK | Formulário de email. |
| `/calendar` | **branco** | Sem login redirect, sem calendário. |
| `/rota-desconhecida-xyz` | **branco** | Sem 404. |

Console no app: 429 em `site.webmanifest` e alguns POSTs. Não bloqueou o render das páginas públicas, mas é ruído de infra.

### Auth

Não feita. Sem credenciais; não usar WhatsApp/SMS reais.

---

## 3. Fonte C — estático (`main` atual)

`tsc --noEmit`: **0 erros** em backend, web, marketing. Nenhum item “só no tsc”.

Achados de código que explicam o live **ou** revalidam o plano 02/09 sem precisar de conta:

| Área | Evidência no código |
|------|---------------------|
| Sem `/calendar` e sem `path="*"` | [`packages/web/src/App.tsx`](../packages/web/src/App.tsx) — rotas explícitas até `/categories`; unmatched = nada. Vite `vercel.json` serve `index.html` (SPA), React Router não pinta. |
| Views da sidebar sem URL | [`handleListSelect`](../packages/web/src/pages/Tasks/index.tsx) só faz `setSelectedList` — zero `searchParams` / `navigate`. |
| Back com overlay | Nenhum `history.pushState` / `?conta=` / `popstate` no web. Overlay não cria entrada de histórico. |
| Integrações sem retry | [`usePendingTasks.ts`](../packages/web/src/hooks/usePendingTasks.ts) seta erro; a UI em Tasks só mostra o `<p>` vermelho — **sem botão retry**. |
| Enter → chat | [`ControlBar.tsx`](../packages/web/src/components/ui/ControlBar/ControlBar.tsx) `useState('prompt')`; Enter no default chama `handlePromptSubmit` → chat. Enter só cria tarefa no modo `task` (lápis). |
| verify-pending perde email | [`VerifyPending/index.tsx`](../packages/web/src/pages/VerifyPending/index.tsx) `location.state?.email` — some no refresh. |
| Nested Dialog | [`FiltersPage.tsx`](../packages/web/src/components/features/account/SettingsDialog/pages/FiltersPage.tsx) monta `CreateListPopover` (`<Dialog>`) **dentro** de `SettingsDialog`. Viola compliance. Profile overlays (password/disconnect/delete) **já** fazem replace (`profileOverlay === null`). |
| Apps “Conectar” disabled | [`AppsPage.tsx`](../packages/web/src/components/features/account/SettingsDialog/pages/AppsPage.tsx) `available: false` ainda mostra **Conectar** disabled, não “Em breve”. WhatsApp copy de loading ainda é “Carregando...”. |
| Quiz step 3 vazio | `getStepError` retorna `null` no step 3 (`idealOutcomeText`); Continuar nunca fica `disabled`. |
| Error tracking | Sem `capture_exceptions`. [`errorHandler.ts`](../packages/backend/src/middleware/errorHandler.ts) só `console.error` em development. |
| Cookie / pixels | Marketing não tem banner de consentimento. Pixel bootstrap corre **antes** do hydrate. |

---

## 4. Lista unificada (implementar nesta ordem)

Cada item: sintoma · evidência · overlap · ação.

### P0 — ship-blockers

#### S1 — `jarvi.life/criar-conta` é 404

- **Sintoma:** URL direta / bookmark / ad mal apontado cai na 404 custom. CTA da home **não** usa essa URL (vai para `app.jarvi.life/criar-conta`).
- **Evidência:** live 404; `next.config.mjs` sem redirect.
- **Overlap:** PR #3 bug 4. PR #1 não cobria.
- **Ação:** redirect 308/307 `jarvi.life/criar-conta` → `app.jarvi.life/criar-conta` (preservar query de atribuição). Marketing-only.

#### S2 — `/calendar` é página branca

- **Sintoma:** `app.jarvi.life/calendar` (autenticado ou não) = canvas branco. Título da tab ainda é “Jarvi”.
- **Evidência:** live; `App.tsx` sem rota `/calendar`.
- **Overlap:** PR #3 bug 5; PR #1 só `?view=calendario`.
- **Ação:** alias `/calendar` → view calendário (e login se unauthenticated, se essa for a regra das outras rotas protected). Não deixar o Router sem match.

#### S3 — rotas desconhecidas = branco

- **Sintoma:** `app.jarvi.life/rota-desconhecida-xyz` branco. Marketing já tem 404; o app não.
- **Evidência:** live; `App.tsx` sem `path="*"`.
- **Overlap:** PR #3 bug 6; PR #1 tinha `NotFound` — **reimplementar no `main`**, não mergear o PR #1.
- **Ação:** `path="*"` + página 404 com link para `/tasks` ou `/login`.

#### S4 — `/verify-pending` perde o email

- **Sintoma:** deep link ou F5 mostra “seu email” genérico; reenviar/verificar falha com “Email não encontrado… cadastro novamente.”
- **Evidência:** live (copy genérica); código só lê `location.state`.
- **Overlap:** PR #3 bug 1. PR #1 não cobria.
- **Ação:** persistir email (`sessionStorage` ou `?email=`), validar, e mostrar o endereço na UI.

#### S5 — views da sidebar nunca mudam a URL

- **Sintoma (plano 02/09):** Hoje / Calendário / Sem data / Vencidas / Recorrentes não alteram a URL; F5 e share perdem a view. **Não revalidado ao vivo** (precisa auth).
- **Evidência:** `handleListSelect` sem router.
- **Overlap:** PR #3 bug 7; PR #1 `?view=`.
- **Ação:** query `?view=` (ou rotas) para **todas** as views da sidebar. Base para S2 e S6.

#### S6 — Back com overlay sai do app

- **Sintoma (plano 02/09):** Back com detalhe / settings / chat aberto navega para fora. **Não revalidado ao vivo.**
- **Evidência:** zero histórico de overlay no código.
- **Overlap:** PR #3 bug 8; PR #1 só `?conta=` em Minha Conta.
- **Ação:** push de histórico por overlay (detalhe, chat, settings, sugerir ideias). Um overlay por vez (compliance).

#### S7 — Integrações: erro vermelho, sem retry

- **Sintoma (plano 02/09):** “Não foi possível carregar as tarefas pendentes.” permanente. **Não revalidado ao vivo.**
- **Evidência:** `usePendingTasks` + UI sem botão; `refresh` existe mas não é exposto na mensagem de erro.
- **Overlap:** PR #3 bug 9. Não assumir 403 de subscription (PR #1).
- **Ação:** investigar causa do fetch; na UI, retry + não deixar o erro como único conteúdo da secção se a lista de tarefas principal já carregou.

#### S8 — Enter no composer default manda para o chat

- **Sintoma (plano 02/09):** Enter no bar default abre IA. **Não revalidado ao vivo.**
- **Evidência:** `ControlBar` mode default `'prompt'`.
- **Overlap:** PR #3 bug 10; PR #1 mudava Enter → criar tarefa.
- **Ação:** Enter no modo default cria tarefa (hoje); paper-plane continua IA. Não regressar o modo lápis.

#### S9 — Drift: login WhatsApp em produção não está neste repo

- **Sintoma:** produção ≠ `Login/index.tsx` deste `main`.
- **Evidência:** screenshot live vs grep vazio de “Login com whatsapp”.
- **Overlap:** novo nesta varredura.
- **Ação:** **investigar** de onde a Vercel faz deploy (outro repo/branch). Congelar auth fixes até o código fonte certo. Não “consertar” o login email deste clone achando que é o que o user vê.

### P1 — fluxo principal com workaround

| ID | Item | Evidência | Overlap | Ação |
|----|------|-----------|---------|------|
| S10 | Quiz: Continuar avança o step 3 (`idealOutcomeText`) vazio; botão nunca disabled | `getStepError` retorna null no step 3 | PR #3 bug 3 (parcial) | Validar ou tornar o step opcional de forma explícita na UI |
| S11 | Nested `Dialog`: Criar Lista/Filtro dentro de Settings | `FiltersPage` + `CreateListPopover` | PR #3 bug 23; viola compliance | Replace, não empilhar |
| S12 | Composer modo lápis / título stale / recorrência / date picker | Só no plano 02/09; **não revalidado** | PR #3 bugs 11–14 | Reproduzir autenticado antes de mexer |
| S13 | Hit targets complete vs delete | Plano 02/09 | PR #3 bug 15 | Reproduzir autenticado |
| S14 | Layout painel IA (coluna vertical) | Plano 02/09 | PR #3 bug 16 | Reproduzir autenticado |

### P2 — polish / legal / observabilidade

| ID | Item | Evidência | Overlap | Ação |
|----|------|-----------|---------|------|
| S15 | Sem cookie banner; pixels disparam sem consentimento | Live home; sem componente de consent no marketing | PR #1 bugs 16–17, não merged | Banner LGPD; pixels só após accept |
| S16 | `/lgpd`, `/privacidade`, `/termos` = 404 | Live | PR #1 landing aliases | Redirects para as páginas canónicas |
| S17 | Apps: Conectar disabled, sem “Em breve”; WhatsApp “Carregando...” | `AppsPage.tsx` | PR #3 bugs 28–29; PR #1 | Copy PT + estado “Em breve” |
| S18 | Sem `capture_exceptions`; `errorHandler` mudo em production | `main.tsx`, `errorHandler.ts` | Novo | Ligar capture no web; log/capture 500 no backend. **Não substitui o MCP** para triagem. |
| S19 | 429 / Vercel Security Checkpoint no app | `curl` 429; browser passa após ~5s; 429 em webmanifest | Novo (ops) | Revisar WAF / bot fight / rate limit. Não é bug de UI. |
| S20 | Calendário header / célula / “+ Nova tarefa” | Só plano 02/09 | PR #3 bugs 17–19 | Backlog até P0 de rotas |
| S21 | Filtros persistir / Novo Filtro no-op | Plano 02/09; nested dialog bloqueia create | PR #3 bugs 20–22 | Depois de S11 |

### Ruído / não-fix

| Item | Notas |
|------|--------|
| In-app browser `postMessage` | Já filtrado em `dropInAppBrowserExceptions`. Se o PostHog MCP ligar e isso ainda aparecer, suppress — não “fix de produto”. |
| Preload warnings no marketing | Console only. |
| PR #1 paywall 403 / trial gate | Plano 02/09: trial da conta QA estava **ativo**. Não reabrir sem reproduzir. |

---

## 5. Overlap rápido vs plano 02/09

| Bug 02/09 | Esta sessão | Status |
|-----------|-------------|--------|
| 1 verify-pending | Live + código | **ainda vivo** |
| 2 greeting nome | Só código (`split` firstName) — greeting de IA; signup usa firstName de propósito | não revalidado ao vivo |
| 3 quiz Continuar | Código: step 3 sem validação | **ainda no código** |
| 4 jarvi.life/criar-conta | Live 404 | **ainda vivo** |
| 5 `/calendar` branco | Live | **ainda vivo** |
| 6 rotas desconhecidas | Live | **ainda vivo** |
| 7 sidebar sem URL | Código | ainda no código (auth) |
| 8 Back overlay | Código | ainda no código (auth) |
| 9 Integrações fetch | Código | ainda no código (auth) |
| 10 Enter → IA | Código | ainda no código (auth) |
| 11–30 | Não percorridos (auth / P2) | manter plano 02/09 |

O que **já funciona** nesta sessão (não “fixar”):

- Home marketing carrega; CTA vai para `app.jarvi.life/criar-conta`.
- Legais canónicos `/politica-de-privacidade` e `/termos-de-uso`.
- 404 custom no **marketing**.
- `/login`, `/criar-conta`, `/forgot-password` renderizam (copy de login em prod ≠ este `main`).
- Settings profile overlays no `main` já fazem unstack (password / disconnect / delete).
- `tsc` limpo nos três packages.

---

## 6. O que esta varredura **não** cobriu

- PostHog Error Tracking (MCP ausente).
- Fluxos autenticados: criar tarefa, complete, delete+undo, composer, detalhe, Integrações, Minha Conta, WhatsApp connect, calendário logado.
- Vercel logs (MCP `needsAuth`).
- GitHub Issues (desabilitadas neste repo).
- Mobile / Expo.
- Stripe / WhatsApp SMS reais.

---

## 7. Ordem sugerida para o próximo agente (código)

Igual ao P0 do plano 02/09, com S9 na frente se auth estiver no escopo:

1. **S9** — confirmar de que git a Vercel publica `app.jarvi.life` (senão os fixes de login/onboarding deste clone não chegam ao user).
2. **S4** verify-pending email.
3. **S1** redirect `jarvi.life/criar-conta`.
4. **S5 + S2 + S3** URL das views, `/calendar`, `path="*"`.
5. **S6** Back / overlay (depois das URLs).
6. **S7** Integrações.
7. **S8** Enter default.
8. P1/P2 da tabela.

PRs pequenos por fase. Sem merge do PR #1. Sem este relatório como “já corrigido”.
