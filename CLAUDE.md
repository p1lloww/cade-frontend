# CLAUDE.md

Front-end do **Cadê?**, sistema de achados e perdidos da UCSal. É um projeto acadêmico do POOALAB (disciplina Programação Orientada a Objetos Avançada, 2026.2), feito por uma equipe de 4 estudantes. A entrega final é em **23/11/2026**, e a mostra com pitch é em 01/12 (ADS) e 03/12 (BES).

Responder em português (BR).

O back-end e toda a documentação ficam em `p1lloww/cade-backend`. O backlog está no GitHub Project https://github.com/users/p1lloww/projects/4.

## Fonte da verdade (no repositório do back-end)

Antes de criar telas ou tarefas, consulte:

- [docs/requisitos.md](https://github.com/p1lloww/cade-backend/blob/main/docs/requisitos.md): RF, RN e RNF (v3) com prioridade P1/P2/P3, perfis (seção 2), fluxo principal (seção 3.2) e estados (seção 6).
- [docs/DECISOES.md](https://github.com/p1lloww/cade-backend/blob/main/docs/DECISOES.md): decisões D01–D15. Para o front, as mais importantes são D02 (login por código), D08 (publicação na Vercel + ngrok), D09 (JWT no header, sem cookie) e D11 (código em inglês).
- [docs/GLOSSARIO.md](https://github.com/p1lloww/cade-backend/blob/main/docs/GLOSSARIO.md): termos dos requisitos → nomes do código.

Se a pasta de trabalho da equipe estiver ao lado (`../cade-backend/docs/`), leia os arquivos de lá.

## Comandos

```bash
npm install
npm start          # http://localhost:4200, usando a API de environment.development.ts
npm test           # testes (Vitest)
npm run build      # build de produção em dist/cade-frontend/browser
```

O back-end precisa estar rodando em `http://localhost:8080` (ver o README do `cade-backend`).

## Stack

Angular 22 (componentes standalone), SCSS, HttpClient com `fetch`, Vitest. Publicado na Vercel; o `vercel.json` manda todas as rotas para o `index.html`.

## Arquitetura e regras

- **Toda regra de negócio e validação fica no back-end.** O front valida só para ajudar o usuário e sempre mostra o erro devolvido pela API.
- **Áreas por perfil** (seção 2 dos requisitos): `public` (visitante), `student`, `staff` (funcionário) e `admin`, com rotas carregadas sob demanda e guarda de rota por perfil. A base comum (layout, serviço de API, interceptor, tratamento de erros) é o card GES-03.
- **Login (D02):** dois passos, e-mail @ucsal.edu.br e depois o código. O JWT recebido vai no header `Authorization` de toda chamada, por um interceptor. Sem cookie (D09).
- **Túnel ngrok (D08, D09):** toda chamada à API envia o header `ngrok-skip-browser-warning`, senão o ngrok devolve uma página de aviso no lugar da resposta.
- **Fotos de objetos:** nunca por `<img src>` com URL pública. Busque com o HttpClient (com o token) como blob e use `URL.createObjectURL`. Foto, descrição interna e local exato nunca aparecem para estudantes nem visitantes (RN03).
- **URL da API:** só em `src/environments/` (`environment.development.ts` para `localhost:8080`, `environment.ts` para o domínio do ngrok). Nada de URL fixa no código.

## Convenções

- **Idioma (D11):** código, nomes de arquivos, componentes e rotas em inglês; textos da interface em português, em linguagem simples (RNF03).
- **Celular primeiro:** tudo funciona a partir de 360 px de largura (RNF09). O cadastro de objeto precisa levar menos de 1 minuto (RNF01).
- **Acessibilidade (RNF10):** contraste suficiente, campos com rótulo, estado nunca comunicado só por cor (ex.: faixa de compatibilidade "alta" escrita, não só verde).
- **Sem dados reais:** nada de dados pessoais, credenciais ou segredos no código ou nos commits.

## Fluxo de trabalho

- A `main` é protegida (D12): todo trabalho vai numa branch (`feat/...`, `fix/...`, `docs/...`, `chore/...`) e entra por PR com aprovação de outro integrante.
- Cada PR resolve um card e cita `Closes #N`. Os cards têm código no título (`[ACE-04]`) e dependências no campo "Depende de" do Project (D13).
- Uso relevante de IA ou biblioteca nova entra na declaração `docs/declaracao-ia-terceiros.md` do `cade-backend`.
- Não fazer commit, push, criar issues ou convidar pessoas sem a equipe pedir.
