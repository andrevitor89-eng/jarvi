# Produto

**Quem lê:** time e AI quando a pergunta é “o que estamos construindo?”, não “qual componente usar?”.

**O que não entra aqui:** spec de Dialog, tokens, bans de CSS. Isso é [compliance](../../packages/web/compliance.md) da superfície.

## O que é a Jarvi

A Jarvi é um app de **tarefas e produtividade**: capturar, organizar e acompanhar o que precisa ser feito, com conta, integrações e memória no produto — não só uma lista local.

## Superfícies

| Superfície | Package | Papel |
|------------|---------|--------|
| App web | `packages/web` | Produto logado (tarefas, conta, settings) |
| Site | `packages/marketing` | Marketing, conversão, conteúdo público |
| Mobile | `packages/mobile` | App iOS/Android (Expo) |

Backend (`packages/backend`) e shared (`packages/shared`) não são superfícies de UI; não têm `compliance.md` de interface.

## Specs de produto

- [Instagram cria tarefa](instagram-tarefas.md) — marcar `@jarvi.life` (ou DM) vira tarefa. PDF: [instagram-tarefas.pdf](instagram-tarefas.pdf). A feature ainda não está no código; o doc é o plano.

## Quando for construir UI

Depois de saber *o quê*, abra o contrato da superfície — não este arquivo:

- Web: [packages/web/compliance.md](../../packages/web/compliance.md)
- Marketing: [packages/marketing/compliance.md](../../packages/marketing/compliance.md)
- Mobile: [packages/mobile/compliance.md](../../packages/mobile/compliance.md)
