# Cadê? — Achados e Perdidos UCSal (front-end)
[![CI](https://github.com/p1lloww/cade-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/p1lloww/cade-frontend/actions/workflows/ci.yml)

Front-end em Angular do Cadê?, publicado na Vercel. O README principal do projeto (problema, validação, integrantes, limitações e declaração de IA) fica no repositório do back-end: [cade-backend](https://github.com/p1lloww/cade-backend).

## Pré-requisitos

- Node.js 22 ou superior
- Back-end rodando em `http://localhost:8080` (ver o README do back-end)

## Como executar

```bash
npm install
npm start
```

Abra http://localhost:4200. O front chama a API sempre em `/api`; em desenvolvimento, o `ng serve` repassa essas chamadas para o back-end em `http://localhost:8080` (regra em `proxy.conf.json`). Assim o navegador fala com um endereço só e não depende do CORS.

## Estrutura

```
src/app/
  core/       serviços usados pelo app inteiro (cliente da API, tratamento de erros, interceptors)
  layout/     cabeçalho e estrutura da página
  shared/     componentes reutilizáveis (ex.: caixa de erro)
  features/   uma pasta por área, carregada sob demanda: public, student, staff, admin
```

## Login e perfis

O login é sem senha (D02): a pessoa informa o e-mail @ucsal.edu.br, recebe um código de 6 dígitos (em desenvolvimento, ele aparece no Mailpit: http://localhost:8025) e troca o código por um token. O token fica no `localStorage` e vai no header `Authorization` de toda chamada à API (`core/auth/auth-interceptor.ts`). Cada área só abre para o seu perfil (`roleGuard`); sem login ou com o token vencido, a pessoa volta ao login e, depois de entrar, à página que tinha pedido. O administrador também entra na área da sala (`/staff`).

Toda chamada à API passa pelo `ApiClient` (`core/api`), que transforma qualquer falha num `ApiError` com a mensagem devolvida pelo back-end. Para mostrar o erro, use `<app-error-message [error]="erro" />`.

## Testes

```bash
npm test
```

## Build e publicação

```bash
npm run build
```

A Vercel publica a pasta `dist/cade-frontend/browser`. O `vercel.json` faz duas coisas:

- repassa `/api/*` para o domínio fixo do túnel (ngrok) do back-end: troque `TROCAR-PELO-DOMINIO-DO-NGROK` pelo domínio de vocês;
- manda as demais rotas para o `index.html` (aplicação de página única).

Se o repasse não funcionar, coloque o domínio do ngrok direto em `src/environments/environment.ts` e libere o domínio da Vercel no `CORS_ORIGINS` do back-end.
