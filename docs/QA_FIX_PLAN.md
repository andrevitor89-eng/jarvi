# Plano de correção QA — bugs ao vivo (2026-09-02)

Documento para um agente Cursor implementar **depois**. Este PR é só o plano: **não alterar código de produto aqui**.

Fonte: sessão de QA em conta real, **não** a lista de agosto do [PR #1](https://github.com/andrevitor89-eng/jarvi/pull/1).

---

## 0. Contexto para o implementador

### Produto e ambiente

| Item | Valor |
|------|--------|
| Marketing | `https://jarvi.life` → `packages/marketing` (Next.js, porta 3002) |
| App | `https://app.jarvi.life` → `packages/web` (React + Vite, porta 3000) |
| API | Railway (proxied via `/api` no Vercel do web) → `packages/backend` |
| Conta de teste | `andrevitor89+jarviqa@outlook.com` |
| Plano | **Plano Gratuito**, trial até **8 set 2026** (trial **ativo** — não reproduzir paywall de trial expirado) |
| Data da sessão | 2026-09-02 |

### Doutrina obrigatória antes de tocar UI

1. Ler [packages/web/compliance.md](../packages/web/compliance.md) — **nunca dois `Dialog` empilhados**.
2. Ler [docs/decisions/0001-one-overlay.md](decisions/0001-one-overlay.md).
3. Voz: PT-BR, produto é **a Jarvi** ([docs/brand/README.md](brand/README.md)).
4. Verificação estática: `npx tsc --noEmit` em `packages/backend` e `packages/web` (depois de `npm run build:shared` se mexer em shared). ESLint do repo está quebrado — não usar como gate.
5. Não há scripts `test` nos packages. Aceitação = passos manuais abaixo + `tsc`. Se extrair helpers puros (ex.: `formatWeekTitle`), testes unitários são bem-vindos mas **não** bloqueiam o primeiro PR.

### Como investigar (não chutar um arquivo)

Cada item abaixo aponta **áreas**. Confirme no código atual (`main` pode ter avançado) com grep/leitura antes de editar. Um único arquivo citado **não** é evangelho.

### PR de implementação

- Branch nova a partir de `main` atualizado (`git fetch origin main`).
- Preferir **vários PRs por fase** (P0 primeiro, um PR por cluster se o diff crescer).
- Não misturar este plano com features novas (busca, notas na sidebar, atalhos globais).

---

## 1. PR #1 — status e overlap (obrigatório ler)

**Status em 2026-09-02:** [PR #1](https://github.com/andrevitor89-eng/jarvi/pull/1) está **OPEN, não merged**. Branch `cursor/fix-qa-bugs-1-18-b0d6`. Base: `main` de agosto. O `main` atual já contém handbook, unstack de settings, pixel OpenAI, etc. — **não faça merge do PR #1 inteiro**. Conflitos e regressões são quase certos.

O PR #1 atacou a lista de agosto (login 403, paywall, Enter→chat, 404, deep link, WhatsApp PT, “Em breve”, marketing legal/cookies). Vários desses itens **ainda aparecem ao vivo** porque o PR nunca entrou. Outros da lista de agosto **já funcionam no live** (paywall dismissível, complete/uncomplete, delete+undo) — **não “consertar” de novo**.

### O que fazer com o PR #1

1. Reabrir o diff do PR #1 só como **referência** (`gh pr diff 1` / ficheiros listados abaixo).
2. **Reimplementar no `main` atual** os pedaços que ainda batem com bugs ao vivo.
3. **Descartar** pedaços que (a) já estão no `main`, (b) não estão na lista ao vivo, (c) são marketing legal/cookies/pixels fora deste plano.
4. Não cherry-pickar commits cegos: o PR #1 muda `taskRoutes` (assinatura), `TrialExpiredGate`, `stripeService`, rotas de notes — risco alto.

Ficheiros do PR #1 mais úteis como referência (não copiar às cegas):

- `packages/web/src/App.tsx` + `pages/NotFound/*` → bugs 5/6
- `packages/web/src/pages/Tasks/index.tsx` + `Sidebar.tsx` (`?view=` / `?conta=`) → bugs 7/8
- `packages/web/src/components/ui/ControlBar/ControlBar.tsx` → bugs 10/11
- `packages/web/src/contexts/TaskContext.tsx` → overlap parcial com bug 9 (lá era 403 de *tasks*, não Integrações)
- `packages/web/src/components/features/account/SettingsDialog/pages/AppsPage.tsx` → bugs 28/29

### Tabela overlap PR #1 ↔ bugs ao vivo

| Bug ao vivo | PR #1 reivindicava? | Ação |
|-------------|---------------------|------|
| 1 verify-pending | Não | Implementar do zero |
| 2 greeting nome | Não (só copy “a Jarvi” em CriarConta) | Implementar do zero |
| 3 quiz Continuar | Não | Implementar do zero |
| 4 jarvi.life/criar-conta | Não (redirects legais `/privacidade`) | Implementar no marketing |
| 5 `/calendar` branco | Parcial: `?view=calendario`, sem rota `/calendar` | Reimplementar + alias `/calendar` |
| 6 rotas desconhecidas | Sim: `path="*"` + `NotFound` | Reimplementar no `main` |
| 7 sidebar sem URL | Sim: `?view=` | Reimplementar; alargar a todas as views |
| 8 Back com overlay | Parcial: só Minha Conta `?conta=` | Reimplementar **e** cobrir detalhe de tarefa + chat + Sugerir ideias |
| 9 Integrações fetch | Parcial: 403 em `/api/tasks` + flash Integrações | **Não** assumir 403 de subscription. Investigar `usePendingTasks`. Flash/esconder vazio pode reusar ideia do PR #1 |
| 10 Enter → IA | Sim: Enter cria tarefa no modo default | Reimplementar; prefixo “QA” é **novo** |
| 11 Criar tarefa Enter / Adicionar | Não de forma explícita | Novo |
| 12 título stale | Não | Novo |
| 13 recorrência no detalhe | Não | Novo |
| 14 date picker | Não | Novo |
| 15 hit targets complete/delete | Não | Novo |
| 16 layout AI panel | Não | Novo |
| 17 header semana Agosto | Não | Novo |
| 18 célula só hora | Parcial: bloquear título vazio no create | Revalidar create/AI + fallback UI |
| 19 + Nova tarefa 2 cliques | Não | Novo |
| 20 filtro não persiste | Não | Novo |
| 21 Novo Filtro no-op | Não | Novo |
| 22 Nova Categoria no-op | Não | Novo |
| 23 Criar Lista fecha modais | Relacionado a overlay; PR #1 não cobriu FiltersPage | Novo; seguir compliance |
| 24 tabs Settings miss | Não | Novo |
| 25 dropdown vs upgrade | Não | Novo |
| 26 Memória vazia / TAREFAS ATIVAS | Não | Novo |
| 27 WhatsApp promo | Não | Novo |
| 28 WhatsApp Carregando / tooltip EN | Sim: `noValidate` + PT | Reimplementar se ainda no live |
| 29 Connect disabled sem “Em breve” | Sim | Reimplementar se ainda no live |
| 30 busca/notas/atalhos/notif | Não (notes API existia; debug endpoint removido no PR #1) | Backlog P3 |

**Conta de teste tem trial ativo.** O fix de “GET `/api/tasks` sem subscription” do PR #1 **não explica** o erro vermelho de Integrações nesta sessão. Não reabrir paywall/403 a menos que reproduza noutro account.

---

## 2. Não-objetivos (explícitos)

- **Não** cobrar Stripe, não criar subscription real, não usar cartão.
- **Não** enviar WhatsApp/SMS reais (Twilio). UI de connect/validação/promo, sim; disparo de mensagem, não.
- **Não** apagar dados da conta de QA nem de outros users. Sem migrations destrutivas em produção. Sem `DELETE FROM users`.
- **Não** “consertar” o que já funciona (secção 3).
- **Não** implementar busca, notas na nav, help de atalhos ou settings de notificação como P0/P1 (secção P3).
- **Não** mudar copy de marca fora do necessário para um bug.
- **Não** adicionar segundo overlay para “resolver” Criar Lista — isso viola compliance.

---

## 3. O que já funciona (não “fixar”)

Reproduzido na sessão 2026-09-02. Se um “fix” quebrar algum destes, o PR está errado.

- Criar tarefa via **Criar tarefa** (lápis) e via **IA** (“beber água amanhã 9h”).
- Completar / descompletar.
- Apagar + **Desfazer**.
- Handle de drag.
- Atribuir categoria (às vezes precisa retry — o retry que funciona hoje não deve ser removido; o flaky é P2 se ainda existir).
- View **Recorrentes**.
- Navegação de mês no calendário.
- Dark mode e temas.
- Minha Conta fecha com **X** e **Esc**.
- Paywall / Pagamentos é **dismissible**.

---

## 4. Fases e ordem de implementação

Fazer **P0 inteiro** antes de P1. Dentro de P0, a ordem abaixo evita retrabalho de histórico.

```
P0-A  Bug 1          verify-pending (email sobrevive refresh)
P0-B  Bug 4          redirect jarvi.life/criar-conta          (isolado, marketing)
P0-C  Bugs 5+6+7     rotas brancas + 404 + URL das views     (um PR)
P0-D  Bug 8          Back fecha overlay                      (depende do esquema de URL de P0-C)
P0-E  Bug 9          Integrações fetch + retry               (isolado)
P0-F  Bug 10         Enter no composer default               (isolado; 11 fica P1)
```

P1 não começa enquanto `/verify-pending` refresh, `/calendar`, `path=*`, Integrações e Enter default não passarem aceitação.

P2 pode paralelizar calendário vs settings depois de P1.

P3 é backlog — só se sobrar e for barato; **não** bloquear ship.

---

## P0 — Ship-blockers

### Bug 1 — `/verify-pending` perde o email no refresh

| | |
|--|--|
| **Severidade** | P0 |
| **Repro** | 1. Criar conta até o OTP. 2. Estar em `/verify-pending`. 3. F5 / abrir a URL em tab nova. 4. Digitar o código de 6 dígitos válido. |
| **Atual** | “Email não encontrado. Por favor, faça o cadastro novamente.” Utilizador tem de voltar ao login. Sem mudar email / skip. |
| **Esperado** | Email visível depois do refresh; código válido ativa a conta. Oferecer “Usar outro email” → `/criar-conta` ou `/login`. Sem skip de verificação. |

**Áreas (investigar):**

- `packages/web/src/pages/VerifyPending/index.tsx` — `email = location.state?.email \|\| ''`; se vazio, **return antes da API** (não é 404 do backend).
- `packages/web/src/pages/CriarConta/index.tsx` e `pages/Login/index.tsx` — `navigate('/verify-pending', { state: { email } })`.
- `packages/web/src/contexts/AuthContext.tsx` — `pendingVerification`.
- `packages/backend/src/controllers/authController.ts` — `verifyEmailOtp`, `resendVerification` (precisam `{ email, code }`).
- **Não há** `sessionStorage` / query param hoje.

**Sketch:**

1. Persistir email em **dois** sítios: `sessionStorage` (ex. `jarvi_pending_email`) **e** query `?email=` (encodeURIComponent). Hidratar: query → storage → `location.state`.
2. Escrever storage na navegação a partir de CriarConta/Login; limpar após OTP sucesso.
3. UI: mostrar o email; link “Usar outro email”; se ainda assim vazio, formulário curto para colar o email (não mandar “faça o cadastro novamente” num código válido).
4. Não logar PII extra; não meter o OTP na URL.

**Aceitação:**

- F5 em `/verify-pending?email=…` mantém o email na UI.
- Código válido após F5 → JWT + entra no app.
- Tab nova com a mesma URL (query) também funciona.
- Sem email em state/storage/query: UI pede o email, não finge que o código é inválido.

**Teste a adicionar:** helper puro `resolvePendingEmail({ search, state, storage })` com 4 casos (query gana, state, storage, vazio). Manual no browser (OTP real ou OTP gerado em SQLite local — **não** na conta de produção).

**Dependências:** nenhuma. Primeiro item.

---

### Bug 4 — `jarvi.life/criar-conta` é 404

| | |
|--|--|
| **Severidade** | P0 (tráfego direto / bookmarks / ads) |
| **Repro** | Abrir `https://jarvi.life/criar-conta` (e `/criar-conta/`). CTAs da homepage já vão a `app.jarvi.life/criar-conta` — não partir isso. |
| **Atual** | 404 do Next (`app/not-found.tsx`). |
| **Esperado** | 308/307 para `https://app.jarvi.life/criar-conta` preservando query (UTM, fbclid). |

**Áreas:**

- `packages/marketing/next.config.mjs` — hoje só `rewrites` PostHog; **sem** `redirects()`.
- `packages/marketing/app/lib/appLinks.ts` — `APP_URL`.
- `packages/marketing/vercel.json` — sem redirects.
- Web já tem rota `/criar-conta` em `packages/web/src/App.tsx`.

**Sketch:** `redirects()` no `next.config.mjs`: `/criar-conta` e `/criar-conta/` → `${APP_URL}/criar-conta` (`permanent: true` ok se query é preservada). Confirmar `NEXT_PUBLIC_APP_URL` em preview vs prod.

**Aceitação:** `curl -I https://jarvi.life/criar-conta` → 308/307 Location `https://app.jarvi.life/criar-conta`. `?utm_source=test` sobrevive. Homepage CTA continua no app host.

**Dependências:** nenhuma. Pode ir no mesmo PR que P0-A ou sozinho (marketing-only).

---

### Bug 5 — `app.jarvi.life/calendar` é página branca

| | |
|--|--|
| **Severidade** | P0 |
| **Repro** | Com sessão, abrir `https://app.jarvi.life/calendar` (URL direta / refresh). Calendário **funciona** via sidebar “Calendário”. |
| **Atual** | `#root` vazio (nenhuma `<Route>` casa). |
| **Esperado** | Calendário (mesma UI da sidebar), URL canónica deep-linkável. |

**Áreas:**

- `packages/web/src/App.tsx` — rotas; **não existe** `/calendar`; **não existe** `path="*"`.
- `packages/web/vercel.json` — SPA rewrite `/:path*` → `index.html` (o branco é client-side).
- `packages/web/src/components/layout/Layout.tsx` — switch de pathname; default = `<Tasks />`.
- `packages/web/src/pages/Tasks/index.tsx` — `selectedList === 'later'` renderiza `CalendarView`.
- `packages/web/src/components/layout/Sidebar/Sidebar.tsx` — NAV `id: 'later'` label Calendário; `handleNavClick` **não** chama `navigate`.
- PR #1 referência: `NotFound` + `?view=calendario`.

**Sketch (fazer junto com 6 e 7):**

1. Fonte de verdade da view: query `?view=` (e path alias).
2. Alias: rota `/calendar` → `<Navigate to="/tasks?view=calendario" replace />` **ou** Layout entende `/calendar` como `later`. Preferir **um** canónico (`/tasks?view=calendario`) + redirect do path antigo.
3. Mapa sugerido (estável, PT sem espaços): `calendario` → `later`, `sem-data` → `noDate`, `vencidas` → `overdue`, `recorrentes` → `recurring`, `semana` → `week`, default / `lista` → `all`. Confirmar ids em `ListType`.
4. Sidebar `onListSelect` faz `navigate` (push) com a query; Tasks hidrata `selectedList` da URL no mount e no `popstate`.

**Aceitação:** `/calendar` mostra o calendário (não branco). Refresh mantém. Sidebar “Calendário” atualiza a URL.

**Dependências:** implementado no mesmo cluster que 6 e 7.

---

### Bug 6 — rotas desconhecidas = branco (sem 404)

| | |
|--|--|
| **Severidade** | P0 |
| **Repro** | Logado: `/foo`, `/subscribe`, `/this-does-not-exist`. Deslogado: o mesmo. |
| **Atual** | Página branca. |
| **Esperado** | 404 da Jarvi com CTA para `/tasks` (auth) ou `/login` (anon). |

**Áreas:** `App.tsx`; PR #1 já tem `packages/web/src/pages/NotFound/` — **recriar no main** (não existe hoje). `UpgradeButton` navega para `/subscribe` sem rota — ou 404 honesta ou página de upgrade; **não** deixar branco. Sem Stripe charge.

**Sketch:** `<Route path="*" element={<NotFound />} />` **depois** das rotas conhecidas. Não apanhar `/calendar` se o alias da bug 5 estiver declarado.

**Aceitação:** `/nao-existe` mostra 404, não branco. Link volta ao app. `/calendar` **não** cai no 404.

**Dependências:** mesmo PR que 5 e 7.

---

### Bug 7 — views da sidebar nunca mudam a URL

| | |
|--|--|
| **Severidade** | P0 (deep link + Back; necessário para 5 e 8) |
| **Repro** | Clicar Lista / Calendário / Sem data / Vencidas / Recorrentes. URL fica `/tasks` (ou `/`). F5 volta sempre à lista. Back do browser não restaura a view. |
| **Atual** | `useState` em Tasks; Sidebar só `setState`. |
| **Esperado** | Cada view tem URL; F5 e partilha restauram; Back percorre o histórico de views. |

**Áreas:** `Tasks/index.tsx` (`selectedList`, `selectedCustomListId`, `selectedCategoryName`); `Sidebar.tsx`; `Layout.tsx`. Listas custom / categorias: `?lista=<id>` / `?categoria=<nome>` (encoding). Não duplicar estado incompatível (lista custom + view built-in).

**Sketch:** um `useEffect` URL → state e handlers state → `navigate({ search })`. `replace` só para o default inicial (evitar lixo no histórico no login). Cliques de nav = `push`.

**Aceitação:** ciclo Sidebar → URL → F5 → mesma view. Back: Calendário → Lista restaura Lista.

**Dependências:** P0-C; P0-D (bug 8) usa o mesmo histórico.

---

### Bug 8 — Back com modal/painel aberto sai do app

| | |
|--|--|
| **Severidade** | P0 |
| **Repro** | Em `/tasks`, abrir (a) detalhe da tarefa, (b) Sugerir ideias / painel de IA, (c) Minha Conta. Premir Back. |
| **Atual** | Sai para branco / deixa o SPA (histórico real: login, marketing, URL inválida). Overlays são só `useState`. |
| **Esperado** | Back **fecha o overlay** e permanece na view. Segundo Back já navega a view/URL anterior. |

**Áreas:**

- `Tasks/index.tsx` — `selectedTask`, `isChatOpen`.
- `TaskDetailsSidebar`, `AIChatPanel`.
- `Sidebar.tsx` — `isSettingsOpen`, `feedbackKind` (Sugerir ideias = `FeedbackDialog`, **não** o chat).
- `SettingsDialog`; `Dialog.tsx` / `BottomSheet.tsx` — Esc/backdrop já chamam `onClose`, sem `popstate`.
- PR #1: só `?conta=` para settings. **Insuficiente** para o live.

**Sketch:**

1. Abrir overlay = `history.pushState` / `navigate` com search (`?task=<id>`, `?chat=1`, `?conta=<page>`, `?feedback=ideas`).
2. Fechar (X, Esc, backdrop) = `pop` se a entrada foi nossa; senão `replace` a limpar o param.
3. `popstate`: se o param desapareceu, fechar o overlay — **não** desmontar o Layout.
4. Trocar de tab dentro de Minha Conta = `replace` (não empilhar).
5. Um overlay de cada vez (compliance): abrir B fecha A e faz `replace` do param, ou pop A e push B — documentar a escolha no PR.
6. Não usar `window.history.back()` no X se a entrada anterior for outro site — nesse caso `replace` a mesma path sem param.

**Aceitação:**

- Tarefa aberta → Back fecha detalhe, URL `/tasks?view=…`.
- Chat / Sugerir ideias → Back fecha.
- Minha Conta → Back fecha (já reivindicado no PR #1; revalidar).
- Sem overlay, Back continua a mudar views (bug 7) e depois pode sair do app.

**Dependências:** P0-C (URL das views). Não implementar 8 com query ad-hoc incompatível com 7.

---

### Bug 9 — Integrações: erro vermelho persistente, sem retry

| | |
|--|--|
| **Severidade** | P0 |
| **Repro** | Login na conta QA → `/tasks`. Secção Integrações: “Não foi possível carregar as tarefas pendentes.” Sem botão retry. Tarefas normais **carregam**. |
| **Atual** | Banner permanente. |
| **Esperado** | Se não há pendentes: **não mostrar** a secção. Se a rede falhar: erro + **Tentar novamente**. Nunca bloquear a lista principal. |

**Áreas (investigar nesta ordem — não assumir o 403 do PR #1):**

1. Network tab: `GET /api/pending-tasks` — status, URL (cuidado com `VITE_API_URL` com ou sem `/api`; o hook faz ``${API_BASE_URL}/api/pending-tasks``; `apiClient` também prefixa `/api/...`. AGENTS.md diz `VITE_API_URL=.../api`; ARCHITECTURE diz sem `/api`. **Medir o pedido real em prod**).
2. `packages/web/src/hooks/usePendingTasks.ts` — `setError('Não foi possível carregar as tarefas pendentes.')`; `refresh` **não é usado** na UI.
3. `packages/web/src/pages/Tasks/index.tsx` (~2037) — secção visível se `isPendingTasksLoading \|\| pendingTasksError \|\| pendingTasks.length > 0`.
4. `packages/backend/src/controllers/pendingTaskController.ts` + tabela `pending_tasks` (Postgres prod). 500 se a tabela não existir.
5. Auth: token atrasado no primeiro paint (PR #1 mexeu nisto para **tasks**; este hook depende de `token` do `AuthContext`).
6. Socket.IO no mesmo hook — falha de socket **não** deveria marcar erro de fetch; confirmar.

**Sketch:**

1. Corrigir URL se for double-`/api` (usar o mesmo helper que `apiClient`).
2. 401: não mostrar Integrações (ou retry silencioso quando o token chegar). 200 `[]`: esconder secção.
3. Expor `refresh` na UI: botão “Tentar novamente”.
4. Não usar a string inglesa `Failed to fetch tasks` do `TaskContext` — é outro canal.
5. Opcional (ideia PR #1): não flashar “Carregando sugestões…” em vazio.

**Aceitação:** load `/tasks` **sem** vermelho se o GET for 200. Falha forçada (DevTools offline no pedido) → erro + retry recupera. Lista de tarefas intacta.

**Teste:** curl autenticado a `/api/pending-tasks` em local; UI com mock 500. Manual na conta QA **sem** apagar dados.

**Dependências:** nenhuma vs routing. Pode paralelizar com P0-A/B.

---

### Bug 10 — Enter no composer default manda para o chat; IA tira o prefixo “QA”

| | |
|--|--|
| **Severidade** | P0 (Enter) / P1 o prefixo da IA (mesmo composer; prefixo pode ir no PR P1 se o Enter já shippar) |
| **Repro** | Composer default (sparkle). Escrever `QA tarefa teste` + Enter. |
| **Atual** | Abre chat de IA. Título criado (se a IA criar) pode perder o prefixo “QA”. |
| **Esperado** | Enter no default **cria tarefa** (hoje, para a data default do composer). Paper-plane continua “Enviar para a IA”. NL tipo “beber água amanhã 9h” via paper-plane / modo IA **continua a funcionar** (secção 3). |

**Áreas:**

- `packages/web/src/components/ui/ControlBar/ControlBar.tsx` — `mode` default `'prompt'`; `handlePromptKeyDown` Enter → `handlePromptSubmit` → `onSubmitPrompt` → chat.
- `packages/web/src/pages/Tasks/index.tsx` — `onSubmitPrompt={handleOpenChatGeneral}`.
- PR #1 já tentou: Enter cria tarefa; **reimplementar no main**.
- Prefixo: **não há strip de “QA” no código**. `packages/backend/src/services/agent/core/prompt.ts` pede títulos curtos; `tools.ts` `title = String(args.title).trim()`. É o modelo.

**Sketch Enter:**

1. Default: Enter → `onCreateTask` com o texto como título (data default = hoje, como o PR #1).
2. Paper-plane / clique sparkle+submit → chat.
3. Shift+Enter = quebra de linha se o campo for textarea.
4. Não abrir `AIChatPanel` no Enter de criação.
5. Copiar a intenção do PR #1, adaptar ao ControlBar atual (attachments, trial lock).

**Sketch prefixo (P1 aceitável):** no `prompt.ts`, regra explícita: **não remover prefixos/siglas** que o user escreveu (`QA`, `WIP`, códigos). Aceitação: chat “cria uma tarefa QA tarefa teste” → título contém `QA`.

**Aceitação P0:** Enter em `/tasks` com “QA tarefa teste” cria **tarefa** na lista, chat fechado. Paper-plane ainda abre IA. “beber água amanhã 9h” via IA continua ok.

**Dependências:** nenhuma. Bug 11 (modo lápis) é P1 no mesmo ficheiro — não regressar o modo tarefa.

---

## P1 — Tarefa, composer, IA, onboarding restante

Ordem sugerida: **11 → 12 → 13 → 14** (mesmo cluster composer/detalhe) → **15 → 16**. Bugs **2 e 3** (onboarding) podem ir num PR pequeno paralelo, depois de P0-A.

### Bug 11 — Modo “Criar tarefa”: Enter não submete; Adicionar pode abrir chat e esmagar o layout

| | |
|--|--|
| **Severidade** | P1 |
| **Repro** | Lápis → “Criar tarefa”. Preencher título. Enter. Clicar Adicionar. Observar se abre “Nova conversa” e a coluna central fica ~1 carácter por linha. |
| **Atual** | Enter no título só submete se `e.target === titleInputRef.current`; descrição não submete; após create, `handleSwitchToPrompt()` volta a modo IA; `hideControlBar={isChatOpen}`. |
| **Esperado** | Enter no título cria a tarefa. Adicionar só cria, **não** abre chat. Layout não colapsa (ver bug 16). |

**Áreas:** `ControlBar.tsx` (`handleTaskKeyDown`, `handleSubmitTask`, `handleSwitchToPrompt`); `ControlBar.module.css` (mobile `taskActions`); `MainLayout`; `Tasks/index.tsx` (`handleControlBarCreateTask`, `handleOpenChatGeneral`).

**Sketch:** Enter no título sempre `preventDefault` + submit se `title.trim()`. Não chamar `onOpenChat`. Depois de criar, ficar em modo tarefa **ou** limpar o form sem abrir chat — escolher um e testar. Layout: ver bug 16 (`min-width` na coluna central).

**Aceitação:** modo lápis, Enter e Adicionar → uma tarefa, chat fechado, texto da lista legível na horizontal.

**Dependências:** depois de 10, mesmo ficheiro.

---

### Bug 12 — Título no detalhe “reverte” depois de editar (save ok)

| | |
|--|--|
| **Severidade** | P1 |
| **Repro** | Abrir tarefa, editar título, blur/Enter. Lista já mostra o novo; o painel volta ao antigo (às vezes só até refresh). |
| **Atual** | Save funciona. UI stale. |
| **Esperado** | Painel = valor gravado sem flicker longo para o título velho. |

**Áreas:**

- `TaskDetailsSidebar.tsx` — `useEffect([task, isEditingTitle])` faz `setTitle(task.title)` **sempre**; `handleChatTaskMutated` invalida `['tasks']`.
- `Tasks/index.tsx` `handleUpdateTask` — merge em `selectedTask`.
- `TaskContext.updateTask` — optimista + PUT; `staleTime: 30_000`; invalidação pode trazer row antiga.

**Sketch:** não sobrescrever título local se `isEditingTitle` **ou** se o `task.updated_at` / valor optimista for mais novo. Fonte: resposta do PUT. Evitar invalidar a query inteira só por um título. Comparar instâncias right-panel vs center-panel (`centerPanelTask`).

**Aceitação:** editar título 3 vezes seguidas; painel e lista iguais após cada save; F5 confirma persistência.

**Dependências:** útil antes de 13 (mesmo effect de sync).

---

### Bug 13 — Recorrência no painel de detalhe não gruda (“volta a Definir”)

| | |
|--|--|
| **Severidade** | P1 |
| **Repro** | Abrir detalhe → chip de recorrência → escolher frequência → fechar picker. Volta ao estado vazio. **Funciona** no composer completo e via IA — **reusar o mesmo path de persistência**. |
| **Atual** | Não gruda no detalhe. Nota: o chip de **data** usa o label `'Definir'` (`formatDateChip`). O de recorrência usa `'Recorrência'`. Confirmar no repro qual chip reverte. |
| **Esperado** | Mesma frequência visível e persistida que no composer/IA. View Recorrentes inclui a tarefa. |

**Áreas:**

- `TaskDetailsSidebar.handleFrequencyChange` — já chama `onUpdateTask` com `recurrence_type` / `recurrence_config` / `recurrence_until`; `currentFrequency` vem **só da prop `task`**.
- `FrequencyPicker.tsx` (partilhado).
- `ControlBar.handleSubmitTask` — create (funciona).
- Backend `taskController.updateTask` — confirmar que PUT persiste os três campos (SQLite e Postgres).
- `TaskContext.updateTask` — `rest` inclui recurrence se o caller enviar.

**Sketch:**

1. Repro instrumentado: Network PUT body vs resposta vs `selectedTask` vs chip.
2. Se o PUT omite campos → alinhar payload ao do create.
3. Se o PUT ok e a prop reverte → bug 12 (sync). Espelhar create: após sucesso, merge explícito em `selectedTask` (já há linhas 263–265 — validar se `recurrence_config` string vs object parte o picker).
4. `parseRecurrenceConfig` vs `JSON.stringify` round-trip.
5. Não inventar API nova; **mesmo contrato** do composer.

**Aceitação:** detalhe → diária/semanal → fechar → reabrir tarefa → frequência lá. Composer e IA continuam ok. Completar ocorrência ainda gera a seguinte (já funciona na view Recorrentes).

**Dependências:** depois de 12.

---

### Bug 14 — Date picker: clique no chip submete; não reabre; hora some no chip

| | |
|--|--|
| **Severidade** | P1 |
| **Repro** | Composer e/ou detalhe: clicar o chip de data; escolher dia/hora; tentar reabrir; ver se o chip mostra a hora. |
| **Atual** | Clique no chip pode submeter a tarefa; picker muitas vezes não reabre com data já setada; hora escolhida não aparece no chip. |
| **Esperado** | Chip só abre/fecha o picker. Submit só Enter (título) / Adicionar. Reabrir sempre. Chip mostra data **e** hora. |

**Áreas:** `TaskDatePicker.tsx`; `ControlBar` (`setShowDatePicker(true)` sem toggle); `TaskDetailsSidebar` (toggle); `Chip.tsx` / `Chip.module.css` (`.label { flex-direction: column }` — risco com bug 16); bubbling: `type="submit"` dentro do `<form>` do ControlBar.

**Sketch:** `type="button"` no chip; `stopPropagation` / `preventDefault` no mousedown do picker. Toggle consistente. Não fechar de forma que `showDatePicker` fique preso. `formatDateChip` usa `dueTime`/`selectedTime`. Click-outside não dispara submit.

**Aceitação:** abrir → escolher dia+hora → chip “Hoje 14:00” (ou equivalente) → reabrir, mudar hora → chip atualiza. Enter no título **não** dispara ao clicar o calendário.

**Dependências:** mesmo cluster que 11.

---

### Bug 15 — Complete vs delete: hit targets no hover

| | |
|--|--|
| **Severidade** | P1 |
| **Repro** | Hover numa row; clicar o controlo que parece completar. Confirmar se apaga. Mobile: não há hover — verificar checkbox vs swipe se existir. |
| **Atual** | Mix-up reportado. Código: checkbox esquerda = complete; hover direita = lápis + lixo. `.actions` anima `width: 0 → auto`. Pending cards: X = reject, check = confirm. |
| **Esperado** | Complete e delete inequívocos; alvos ≥ 40px sem deslocar no hover; `aria-label` PT. |

**Áreas:** `TaskItem.tsx` + `.module.css`; `PendingTaskCard.tsx`; ícones Phosphor.

**Sketch:** separar hit areas; não animar width sobre o checkbox; tooltip/aria “Concluir” vs “Excluir”. Não mudar o comportamento que já funciona (complete/delete+undo) — só alvos.

**Aceitação:** 10 cliques no checkbox = complete; 10 no lixo = delete+undo toast. Nenhum cruzamento.

---

### Bug 16 — Sidebar duplica labels; coluna central vira letras na vertical com o painel de IA

| | |
|--|--|
| **Severidade** | P1 |
| **Repro** | Abrir chat de IA (paper-plane) com viewport ~1280–1440. Sidebar colapsa; centro ilegível. Durante a animação, labels da sidebar sobrepõem. |
| **Atual** | `MainLayout`: sidebar 320→56 + main `flex:1; min-width:0` + right ~606px. `Sidebar` monta **dois** painéis (expanded + collapsed) com fade. |
| **Esperado** | Texto da lista na horizontal (ellipsis se preciso). Sidebar collapsed = só ícones, sem labels fantasma. |

**Áreas:** `MainLayout.module.css`; `Sidebar.module.css` / `Sidebar.tsx`; `AIChatPanel.module.css`; `Tasks.module.css`; `Chip.module.css`.

**Sketch:** `min-width` (ex. 20–24rem) na coluna central; chat `max-width` / `min(606px, 40vw)`. No collapse, `visibility`/`pointer-events` no painel expanded **já no início** da animação, não só opacity. Não `flex-direction: column` em labels de chip na lista.

**Aceitação:** chat aberto a 1280 e 1440px: títulos de tarefa numa linha com ellipsis. Collapse da sidebar sem texto duplicado. Bug 11 (Adicionar) não reproduz o colapso.

**Dependências:** verifica 11.

---

### Bug 2 — Saudação corta o nome no primeiro espaço

| | |
|--|--|
| **Severidade** | P2 de produto / **P1 barato** (mesmo fluxo de signup que o P0-A) |
| **Repro** | Quiz “Como você prefere ser chamado?” = `QA Teste Jarvi` → passo da conta. |
| **Atual** | “Quase lá, QA!” |
| **Esperado** | “Quase lá, QA Teste Jarvi!” (nome como o user escreveu, trimmed). Não inventar first-name. |

**Áreas:** `CriarConta/index.tsx` ~519: `split(/\s+/)[0]`. Não confundir com `firstNameOf` no backend (CAPI) nem `gender.ts`.

**Sketch:** usar `formData.name.trim()` (capitalize só a primeira letra da string se já for a regra, **sem** partir tokens).

**Aceitação:** nome com 3 palavras aparece inteiro. Nome vazio continua “Quase lá!”.

---

### Bug 3 — Quiz: Continuar parece disabled; steps 2–4 avançam vazios; 5ª opção cortada

| | |
|--|--|
| **Severidade** | P1 (onboarding) |
| **Repro** | `/criar-conta`. Observar Continuar (branco/secundário). Steps de chips/checklist: Continuar sem seleção. Viewport baixa (~700px): última opção cortada. |
| **Atual** | Continuar **nunca** tem `disabled`; `variant="secondary"` nos steps 0–2. `getStepError` bloqueia 0–2 com mensagem, mas o step 3 (texto ideal) é opcional. Fade 64px + altura fixa do painel. |
| **Esperado** | Continuar visualmente disabled até válido; clique inválido não avança (já a intenção de 0–2). Step de outcome pode continuar opcional — **não** forçar texto. Lista faz scroll até à última opção, sem clip permanente. |

**Áreas:** `CriarConta/index.tsx` (`getStepError`, `handleContinue`, Button); `CriarConta.module.css` (`.optionsScrollFade`, `height: min(816px, calc(100vh - 48px))`); `Button.module.css` secondary vs disabled.

**Sketch:** `disabled={!canContinue}` **ou** primary sempre + aria. Confirmar numeração QA (stepper 2–4 = tracking / dorest / outcome). Padding-bottom da lista > fade. Testar 700px e 900px de altura.

**Aceitação:** sem seleção nos multi-select, Continuar parece e está disabled (ou não avança). 5ª/9ª opção clicável. Outcome vazio ainda pode avançar se for a regra de produto — documentar no PR.

**Dependências:** nenhum P0. Evitar conflito com P0-A no mesmo ficheiro se PRs paralelos.

---

## P2 — Calendário, settings, filtros, memória, apps

Pode começar quando P0+P1 críticos de tarefa (10–14) estiverem estáveis. Overlay de filtros (21–23) **antes** de persistência (20), porque o Dialog nested impede o create.

### Bug 17 — Header da semana diz “Agosto 2026” para 31 ago–6 set

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Calendário view semana que cruza mês (31 ago 2026 – 6 set 2026). |
| **Atual** | “Agosto 2026” (`formatWeekTitle` usa só `days[0]`). |
| **Esperado** | Label de intervalo, ex. “31 ago – 6 set 2026” (ou “Agosto – Setembro 2026”). Consistente em virada de ano. |

**Áreas:** `CalendarView.tsx` `formatWeekTitle`, `PT_MONTH_NAMES`.

**Sketch:** se mês/ano de `days[0]` ≠ `days[days.length-1]`, formatar range. Helper puro + testes de data (timezone local; usar datas noon local para não cruzar UTC).

**Aceitação:** semana do 31 ago 2026 não diz só Agosto. Semana só em setembro diz Setembro.

---

### Bug 18 — Célula do mês: só hora, título vazio (IA 15 out 14:00)

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Tarefa criada por IA com data 15 out 14:00; ver célula do mês. |
| **Atual** | Chip de hora, título invisível. Create API e agent exigem título — pode ser whitespace, update que limpou, ou `task.title` vazio na pill. |
| **Esperado** | Sempre um título visível (fallback “Sem título” **não** é desejável se pudermos impedir vazio). IA não grava título vazio. |

**Áreas:** `CalendarTaskPill` em `CalendarView.tsx`; `TaskContext`; `taskController.createTask`; `tools.ts` `executeCreateTask` / `executeUpdateTask`; filtro de vazios (PR #1 filtrava na lista — **calendário pode não filtrar**).

**Sketch:** (1) UI fallback se `!task.title.trim()`. (2) Recusar whitespace no update. (3) Prompt IA: título obrigatório e não só a hora. Não migrar/apagar rows em prod; esconder ou fallback.

**Aceitação:** nova tarefa IA com data/hora mostra título na célula. Row antiga vazia não parte o layout.

---

### Bug 19 — “+ / Nova tarefa” no calendário: dois cliques; primeiro destaca outro dia

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Calendário semana/mês: clicar + / Nova tarefa. Primeiro clique destaca outro dia; segundo abre o create. |
| **Atual** | `hoveredSlotKey` vs `activeSlotKey`; vários `CalendarEmptySlot` por coluna; mês: hover na célula, + separado. |
| **Esperado** | Um clique no + do dia X abre create **nesse** dia. |

**Áreas:** `CalendarView.tsx` `CalendarEmptySlot`, `MonthCellCreate`, `empty-${dateKey}-${index}`.

**Sketch:** o clique do + usa `dateKey` do slot, não o hover. Hover não roubar o próximo click. Evitar `pointer-events` em slots vazios vizinhos.

**Aceitação:** um clique, dia certo, uma tarefa. Não regressar nav de mês (já funciona).

---

### Bug 20 — “Salvar como…” não persiste no sidebar Filtros

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Aplicar filtro → Salvar como… → nomear. Sidebar Filtros continua vazio. |
| **Atual** | `FilterPopover.handleSave` manda só `categoryNames`. Backend `listController` exige pelo menos um critério (categoria, prioridade, app, sem-categoria). Save de prioridade-only → 400. |
| **Esperado** | Lista aparece em Filtros com os critérios aplicados; sobrevive F5. |

**Áreas:** `FilterPopover.tsx`; `ListContext.tsx`; `listController.ts`; `Sidebar` `customLists`; `Tasks/index.tsx` filtro por `selectedCustomListId`.

**Sketch:** `createList` com `priority`, `connectedApp`, `showCompleted`, categorias, `filter_no_category`. Toast de erro PT se 400. Não salvar draft não aplicado (UI já esconde Salvar antes de Aplicar — confirmar).

**Aceitação:** salvar filtro por categoria **e** por prioridade; ambos no sidebar; F5 ok.

**Dependências:** se 21/23 impedem o create dialog, fazer overlay primeiro.

---

### Bug 21 — “Novo Filtro” / “Criar filtro” não fazem nada

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Minha Conta → Filtros → Novo Filtro. Sidebar Filtros → Criar filtro / +. |
| **Atual** | Sidebar só `openSettings('filters')`. FiltersPage `setIsCreateOpen(true)` monta `CreateListPopover` (**Dialog**) **dentro** de SettingsDialog (**Dialog**) → viola compliance; click-outside fecha tudo (bug 23). `setIsCreateListOpen(true)` em Tasks **nunca é chamado**. |
| **Esperado** | Abre fluxo de criar lista/filtro utilizável. |

**Áreas:** `FiltersPage.tsx`; `CreateListPopover.tsx`; `Sidebar.handleAddFilter`; `Tasks/index.tsx`; compliance.md.

**Sketch (obrigatório replace ou swap, não nested):** padrão de `ProfilePage` / `profileOverlay`: fechar Settings → abrir `CreateListPopover` → ao fechar, reabrir Settings em Filtros. **Ou** wizard dentro do mesmo `SettingsDialog` (sem segundo `Dialog`). Sidebar “Criar filtro” dispara o mesmo fluxo, não só a tab vazia.

**Aceitação:** ambos os botões abrem o formulário; completar cria lista (bug 20); Esc fecha um overlay de cada vez.

**Dependências:** compliance; mesmo PR que 23.

---

### Bug 22 — “Nova Categoria” em Minha Conta → Categorias não faz nada

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Minha Conta → Categorias → Nova Categoria. Criar categoria **por outro caminho funciona** (picker da tarefa). |
| **Atual** | `CategoriesPage` usa create **inline** no topo da lista scrollável — fácil de não ver. Sidebar “Criar categoria” só abre a tab. |
| **Esperado** | Ação óbvia: linha inline visível (scroll into view + focus) ou replace overlay. |

**Áreas:** `CategoriesPage.tsx`; `CategoryContext.tsx`; `CategoryPicker.tsx` (referência que funciona).

**Sketch:** `scrollIntoView` + focus no input; não nested Dialog. Se o click realmente não chama `setIsCreating`, corrigir o handler.

**Aceitação:** botão mostra input; Enter grava; categoria no picker da tarefa.

---

### Bug 23 — Clique no Nome em “Criar Lista” fecha os dois modais

| | |
|--|--|
| **Severidade** | P2 (bloqueia 20/21) |
| **Repro** | Minha Conta → Filtros → Novo Filtro (se o dialog chegar a abrir) → focar Nome. |
| **Atual** | Dois `Dialog` em `document.body`; parent trata o child portal como outside click (`Dialog.tsx` `handleClickOutside`). |
| **Esperado** | Focar Nome edita o campo. Um overlay. |

**Áreas:** `Dialog.tsx`; `FiltersPage`; `CreateListPopover`; `Sidebar` replace de profile.

**Sketch:** **não** “ignorar outside click se houver filho” como solução permanente (incentiva nested). Aplicar replace/swap da bug 21. Se algum popover âncora for preciso, usar `Dropdown`/popover **sem** segundo `Dialog` de página.

**Aceitação:** grep/runtime: zero dois `Dialog isOpen` simultâneos neste fluxo. Nome editável.

**Dependências:** mesmo PR que 21.

---

### Bug 24 — Clique nas tabs de Settings acerta a tab errada (Memória → Apps)

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Minha Conta, clicar Memória; Apps fica selecionado (off-by-one ~48px). |
| **Atual** | `SIDEBAR_ITEMS`: profile, payments, **apps**, **memory**. `ListItem` 48px. `.closeButton` absolute no wrapper. |
| **Esperado** | Hit target = label clicado. |

**Áreas:** `SettingsDialog.tsx` + `.module.css`; `ListItem.tsx`. Inspecionar no browser (overlay, scroll, padding do close).

**Sketch:** garantir que o close não cobre a nav; `pointer-events` só no ícone; hit slop alinhado ao texto. Testar desktop 860px de altura e viewport curta.

**Aceitação:** clicar cada tab 3× — `activePage` correto (incluindo Memória e Apps).

---

### Bug 25 — Dropdown do user sobrepõe “Fazer upgrade” (z-index)

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Abrir menu do avatar na sidebar. |
| **Atual** | `Dropdown` backdrop z-index 999, menu 1000; `UpgradeButton` no fluxo abaixo. |
| **Esperado** | Menu acima do CTA **ou** CTA não clicável por baixo do backdrop (comportamento de menu: backdrop come o clique). Sem overlap visual ilegível. |

**Áreas:** `Sidebar.tsx` (userRow + proCta); `Dropdown.tsx` / `.module.css`.

**Sketch:** âncora + `collision` para abrir para cima se não couber; backdrop bloqueia o upgrade enquanto aberto; fechar no segundo clique no avatar.

**Aceitação:** menu aberto, “Fazer upgrade” não é o alvo do clique (backdrop). Menu fechado, upgrade clicável. **Não** ir ao Stripe checkout real (parar no paywall dismissible).

---

### Bug 26 — Memória: vazio ~1s; “TAREFAS ATIVAS (nenhuma)” com ~10 tarefas

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Minha Conta → Memória. Flash vazio; texto com `TAREFAS ATIVAS (nenhuma)` apesar de tarefas vivas. |
| **Atual** | `MemoryPage` `memoryText=''` até o GET. Reconciliação LLM em `memory.ts` injeta `TAREFAS ATIVAS DO USUÁRIO:` com `(nenhuma)` se `activeTasks.length === 0` **no momento do job** (login/chat) e o modelo **grava isso** no `memory_text`. GET não reconcilia. |

**Áreas:** `MemoryPage.tsx`; `GET/PUT /api/users/memory-profile`; `packages/backend/src/services/agent/core/memory.ts`; `authController` / `web.ts` triggers.

**Sketch:** skeleton/disabled com “A carregar…” até o GET (não textarea vazia fingindo perfil vazio). Prompt: **não** persistir o bloco de inventário de tarefas no texto gravado (é contexto efémero). Não apagar memória do user à mão em prod; o próximo reconcile pode limpar o header se o prompt mudar. Não inventar tasks.

**Aceitação:** abrir Memória: loading visível depois conteúdo. Novas reconciliações não escrevem “(nenhuma)” quando existem tarefas ativas. Sem DELETE de perfil.

---

### Bug 27 — WhatsApp “Conectar” vai à lista genérica; promo volta depois de “Não mostrar mais”

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Promo welcome → Conectar. Modal → Não mostrar mais / Pular → F5. |
| **Atual** | `openSettings('apps')` sem `view=whatsapp`. Modal “Pular” **não** chama `dismissWhatsAppPromo`; só o floating “Não mostrar mais” faz POST dismiss. Reload após seen_at mostra **floating**. |
| **Esperado** | Conectar abre o **formulário WhatsApp**. Qualquer “não mostrar” persiste no servidor (F5 limpo). |

**Áreas:** `Sidebar.tsx` promo; `WhatsNewCard`; `AppsPage.tsx` `view`; `userRoutes.ts` impression/dismiss.

**Sketch:** `openSettings('apps', { app: 'whatsapp' })` ou query `?conta=apps&app=whatsapp` (alinhar à bug 8). Modal secondary = mesmo `dismissWhatsAppPromo`. Sem SMS real.

**Aceitação:** Conectar → input de telefone. Dismiss → F5 sem promo. Conta QA: não desligar WhatsApp de produção de outros users.

---

### Bug 28 — WhatsApp: “Carregando...” eterno; validação vazia em inglês

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Apps → WhatsApp. Overlay Carregando. Submit vazio: tooltip nativo EN. |
| **Atual** | PR #1 reivindicava `noValidate` + PT + timeout. **Revalidar live**; se já estiver no main, só fechar gaps. `statusLoading` renderiza “Carregando...” **em simultâneo** com o form. `required` nativo no input. |

**Áreas:** `AppsPage.tsx` `WhatsAppConnectPage`; `TextInput`.

**Sketch:** loading **ou** form, não ambos; timeout + erro PT; `noValidate` + mensagem “Introduz um número…” (copy da Jarvi). Sem chamada Twilio se o número for inválido.

**Aceitação:** estados: loading curto → form; vazio → erro PT; número curto não bate na API.

**Overlap PR #1:** reusar a abordagem, não o commit inteiro.

---

### Bug 29 — Gmail/Outlook/Calendar/Alexa Connect disabled sem “Em breve”

| | |
|--|--|
| **Severidade** | P2 |
| **Repro** | Minha Conta → Apps. Botões disabled, sem explicação. |
| **Atual** | `APPS[].available: false` só WhatsApp true. PR #1 adicionava “Em breve”. |
| **Esperado** | Disabled + label **Em breve** (e se for gate de plano, dizê-lo — conta QA é gratuito; **não** inventar Gmail funcional). |

**Áreas:** `AppsPage.tsx`; ícones em `packages/web/public/icons/apps/` (PR #1 corrigiu `fill` em `<img>` — se ícones invisíveis no live, reaplicar).

**Sketch:** texto visível na card, não só `aria-label`. Não habilitar Connect falso.

**Aceitação:** cada app indisponível mostra “Em breve”. WhatsApp continua o único connectable.

---

## P3 — Backlog (não P0)

### Bug 30 — Sem busca, notas na nav, help de atalhos, settings de notificação

| Feature | Estado no repo | Ação neste programa de QA |
|---------|----------------|---------------------------|
| Busca global | Não existe | Backlog. Não bloquear P0. |
| Notas | `pages/Notes.tsx` + rota `/notes` + `NoteContext` / `/api/notes`. **Fora da Sidebar.** | Se for “barato”: link na nav. Senão backlog. Não construir editor novo. |
| Atalhos | Só em `notes/KeyboardShortcuts.tsx` | Backlog para Tasks. |
| Notificações (settings) | Não existe (só toasts Sonner) | Backlog. Sem push real. |
| Finances / Habits / Goals | Stubs “em desenvolvimento” | Não scope. |

**Aceitação P3 (se alguém puxar notas na nav):** item “Notas” na sidebar → `/notes`; Back (bug 8) não parte. Caso contrário: fechar como Wont-do neste ciclo, listado no PR de implementação.

---

## 5. Mapa rápido bug → packages

| Bugs | Package principal |
|------|-------------------|
| 1, 2, 3 | `web` (CriarConta, VerifyPending); `backend` auth só se a API exigir mudança (improvável para 1) |
| 4 | `marketing` |
| 5–8 | `web` (App, Layout, Tasks, Sidebar, Dialog) |
| 9 | `web` hook + `backend` pending-tasks |
| 10–16 | `web` ControlBar / TaskDetails / TaskItem / MainLayout; `backend` prompt/tools só para prefixo QA e título vazio |
| 17–19 | `web` CalendarView |
| 20–25 | `web` filters/settings/sidebar; `backend` lists se o contrato do POST estiver incompleto |
| 26 | `web` MemoryPage + `backend` memory.ts |
| 27–29 | `web` AppsPage / Sidebar; `backend` userRoutes promo |
| 30 | `web` nav (opcional) |

---

## 6. Verificação global antes de mergear um PR de código

1. `npm run build:shared` se mexeu em shared.
2. `npx tsc --noEmit` em `packages/web` e `packages/backend` (e `packages/marketing` se bug 4).
3. Browser, conta QA ou conta local equivalente:
   - P0 completo na checklist acima.
   - Smoke da secção 3 (não regressar).
4. Overlay: um `Dialog` de cada vez (bugs 21–23, 8).
5. Sem Stripe charge, sem SMS, sem delete de user.
6. Confirmar de novo se o PR #1 ainda está open; não o mergear.

---

## 7. Ordem de PRs de implementação sugerida

| PR | Conteúdo |
|----|----------|
| 1 | P0-A + P0-B (verify-pending + redirect criar-conta) |
| 2 | P0-C + P0-D (rotas, views, Back) |
| 3 | P0-E (Integrações) |
| 4 | P0-F + P1-11 + P1-14 (composer Enter / Criar tarefa / date chip) |
| 5 | P1-12 + P1-13 (detalhe título + recorrência) |
| 6 | P1-15 + P1-16 (hit targets + layout) |
| 7 | P1-2 + P1-3 (quiz) |
| 8 | P2 calendário 17–19 |
| 9 | P2 overlay filtros 21+23+20+22 |
| 10 | P2 settings chrome 24–25, memória 26, apps 27–29 |
| — | P3 só se produto pedir |

Juntar PRs se o implementador for um único agente e o diff permanecer revistável; **não** um monólito P0–P3.

---

## 8. Checklist do agente implementador (copiar para o PR de código)

- [ ] Li este ficheiro e o `compliance.md` do web
- [ ] Confirmei PR #1 ainda unmerged; não fiz merge dele
- [ ] Não alterei o que a secção 3 diz que funciona, excepto se um P0 o exigir (e então re-testei)
- [ ] Não-objetivos respeitados
- [ ] Cada bug do PR tem o teste de aceitação correspondente passado
- [ ] `tsc --noEmit` limpo nos packages tocados
