import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import DashboardPage from './dashboard-page';

const DATA = {
  byStatusAndCategory: [
    { status: 'RETURNED', statusLabel: 'Devolvido', category: 'Garrafa', total: 3 },
    { status: 'AVAILABLE', statusLabel: 'Disponível', category: 'Celular', total: 1 },
    { status: 'AVAILABLE', statusLabel: 'Disponível', category: 'Garrafa', total: 2 },
  ],
  byStatus: [
    { status: 'RETURNED', statusLabel: 'Devolvido', total: 3 },
    { status: 'AVAILABLE', statusLabel: 'Disponível', total: 3 },
  ],
  unclaimed: 2,
  returnsThisMonth: 3,
  averageDaysToReturn: 6.5,
  generatedAt: '2026-11-24T13:00:00Z',
};

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardPage);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function respond(data: object = DATA): Promise<void> {
    http.expectOne('/api/dashboard').flush(data);
    await fixture.whenStable();
  }

  const text = (selector: string) =>
    page.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  it('mostra os números de destaque escritos', async () => {
    await respond();

    const tiles = [...page.querySelectorAll('.tile')].map((t) => [
      t.querySelector('.tile__label')?.textContent?.trim(),
      t.querySelector('.tile__value')?.textContent?.replace(/\s+/g, ' ').trim(),
    ]);
    expect(tiles).toEqual([
      ['Devoluções neste mês', '3'],
      ['Tempo médio até a devolução', '6,5 dias'],
      ['Não reclamados', '2'],
      ['Objetos cadastrados', '6'],
    ]);
    expect(page.querySelector('.tile__link')?.getAttribute('href')).toBe('/staff/unclaimed');
  });

  it('põe as situações na ordem do ciclo, com o número ao lado da barra', async () => {
    await respond();

    const bars = [...page.querySelectorAll('.bar')].map((b) => [
      b.querySelector('.bar__label')?.textContent,
      b.querySelector('.bar__value')?.textContent,
    ]);
    expect(bars).toEqual([
      ['Disponível', '3'],
      ['Devolvido', '3'],
    ]);
    expect(page.querySelector('.bar__track')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('monta a tabela categoria × situação com totais', async () => {
    await respond();

    expect([...page.querySelectorAll('thead th')].map((th) => th.textContent?.trim())).toEqual([
      'Categoria',
      'Disponível',
      'Devolvido',
      'Total',
    ]);
    const rows = [...page.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.children].map((cell) => cell.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['Celular', '1', '0', '1'],
      ['Garrafa', '2', '3', '5'],
    ]);
  });

  it('explica quando ainda não houve devolução', async () => {
    await respond({ ...DATA, averageDaysToReturn: null, returnsThisMonth: 0 });

    expect(text('.tile:nth-child(2) .tile__value')).toBe('Sem devoluções ainda');
  });

  it('diz "menos de 1 dia" quando as devoluções são no mesmo dia', async () => {
    await respond({ ...DATA, averageDaysToReturn: 0.2 });

    expect(text('.tile:nth-child(2) .tile__value')).toBe('Menos de 1 dia');
  });
});
