/**
 * Produção (Vercel). A API é chamada no mesmo endereço do site, em /api, e a Vercel repassa essas chamadas ao
 * túnel do back-end (regra em vercel.json). Se o repasse não funcionar, troque pelo domínio do ngrok e libere o
 * domínio da Vercel no CORS_ORIGINS do back-end.
 */
export const environment = {
  apiUrl: '/api',
};
