import { allowedRisks } from './category';

describe('allowedRisks', () => {
  it('só deixa o risco subir na escala a partir do padrão da categoria', () => {
    expect(allowedRisks('LOW')).toEqual(['LOW', 'MEDIUM', 'HIGH']);
    expect(allowedRisks('MEDIUM')).toEqual(['MEDIUM', 'HIGH']);
    expect(allowedRisks('HIGH')).toEqual(['HIGH']);
  });

  it('mantém documento como documento, fora da escala', () => {
    expect(allowedRisks('DOCUMENT')).toEqual(['DOCUMENT']);
  });
});
