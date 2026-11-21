/**
 * Produção (Vercel). A API é chamada no mesmo endereço do site, em /api, e a Vercel repassa essas chamadas ao
 * túnel do back-end (regra em vercel.json). Se o repasse não funcionar, troque pelo domínio do ngrok e libere o
 * domínio da Vercel no CORS_ORIGINS do back-end.
 */
export const environment = {
  apiUrl: '/api',
  /** Chave da licença Community do PrimeNG (vai no bundle, não é segredo). Sem ela aparece um aviso na tela. */
  primengLicense: 'eyJpZCI6IjBjZWZlY2RjLWQ2NzAtNDY5OS1iZjMyLTk4Y2M4NGE3NTJkZCIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODc0MTAwNTksImV4cCI6MTgxODk0NjA1OX0.Ssnv-fLYdPO7948D4kUCqEoIbfQ185kOb8vcGfAIid0brQeu22Ov17iyQ1G1jHLDESCN0uBZArWyMT2nEf84Aw',
};
