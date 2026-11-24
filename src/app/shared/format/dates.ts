const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Data sem hora da API (AAAA-MM-DD) por extenso curto, ex.: "20 de nov.". Lida pelos números, sem `new Date(texto)`,
 * que trataria a data como meia-noite UTC e mostraria o dia anterior no horário de Brasília.
 */
export function formatDay(value: string): string {
  const match = DAY.exec(value);
  if (!match) {
    return value;
  }
  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });
}

/** Data em que a perda aconteceu: um dia, ou um período. */
export function formatPeriod(from: string, until: string | null): string {
  return !until || until === from ? formatDay(from) : `${formatDay(from)} a ${formatDay(until)}`;
}

/** Instante da API (ISO com fuso) como data por extenso, ex.: "23 de dezembro". */
export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

/** Data local no formato da API (AAAA-MM-DD); o `toISOString` usa UTC e erra a data à noite. */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Hoje e ontem no formato da API, para os atalhos dos formulários. */
export function recentDays(): { today: string; yesterday: string } {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return { today: isoDate(now), yesterday: isoDate(yesterday) };
}

/** Instante da API com dia e hora, ex.: "24 de nov., 10:35". */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
