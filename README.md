# Cadê? — Achados e Perdidos UCSal (front-end)

Front-end em Angular do Cadê?, publicado na Vercel. O README principal do projeto (problema, validação, integrantes, limitações e declaração de IA) fica no repositório do back-end: [cade-backend](https://github.com/p1lloww/cade-backend).

## Pré-requisitos

- Node.js 22 ou superior
- Back-end rodando em `http://localhost:8080` (ver o README do back-end)

## Como executar

```bash
npm install
npm start
```

Abra http://localhost:4200. Em desenvolvimento, a API usada é a de `src/environments/environment.development.ts`.

## Testes

```bash
npm test
```

## Build e publicação

```bash
npm run build
```

A Vercel publica a pasta `dist/cade-frontend/browser`. O `vercel.json` redireciona todas as rotas para o `index.html` (aplicação de página única).

O endereço da API em produção fica em `src/environments/environment.ts` e aponta para o domínio fixo do túnel (ngrok) do back-end.
