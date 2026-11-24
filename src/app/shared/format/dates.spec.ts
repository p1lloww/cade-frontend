import { formatDay, formatPeriod } from './dates';

describe('dates', () => {
  it('mostra o dia da API sem voltar um dia pelo fuso', () => {
    expect(formatDay('2026-11-01')).toMatch(/^1 de nov/);
  });

  it('mostra um dia só quando o período começa e termina no mesmo dia', () => {
    expect(formatPeriod('2026-11-20', '2026-11-20')).toBe(formatDay('2026-11-20'));
    expect(formatPeriod('2026-11-20', null)).toBe(formatDay('2026-11-20'));
  });

  it('mostra o período quando há duas datas', () => {
    expect(formatPeriod('2026-11-20', '2026-11-23')).toBe(
      `${formatDay('2026-11-20')} a ${formatDay('2026-11-23')}`,
    );
  });
});
