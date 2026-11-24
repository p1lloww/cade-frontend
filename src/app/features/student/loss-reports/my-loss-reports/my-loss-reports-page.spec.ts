import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LossReport, LossReportStatus } from '../loss-report';
import MyLossReportsPage from './my-loss-reports-page';

function report(id: string, status: LossReportStatus, extra: Partial<LossReport> = {}): LossReport {
  return {
    id,
    categoryName: 'Fone',
    description: `Registro ${id}`,
    locationsLabel: 'Bloco 400, Sala 421',
    lostFrom: '2026-11-20',
    lostUntil: '2026-11-20',
    shift: null,
    shiftLabel: 'Turno não informado',
    status,
    statusLabel: status,
    statusDescription: `Explicação de ${id}`,
    registeredAt: '2026-11-20T12:00:00Z',
    expiresAt: '2026-12-20T12:00:00Z',
    version: 0,
    infoRequestReason: null,
    ...extra,
  };
}

const SUMMONS = {
  id: 's1',
  lossReportId: 'r-summoned',
  summonedAt: '2026-11-22T12:00:00Z',
  expiresAt: '2026-11-29T12:00:00Z',
  place: 'Sala de achados e perdidos',
  hours: 'Segunda a sexta, das 7h às 21h50',
  whatToBring: 'Um documento com foto.',
};

describe('MyLossReportsPage', () => {
  let fixture: ComponentFixture<MyLossReportsPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MyLossReportsPage);
    page = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  async function respond(reports: LossReport[], summons: unknown[] = []): Promise<void> {
    await fixture.whenStable();
    http.expectOne('/api/loss-reports/mine').flush(reports);
    http.expectOne('/api/summons/mine').flush(summons);
    await fixture.whenStable();
  }

  const titles = (section: string) =>
    [...page.querySelectorAll(`section[aria-labelledby="${section}"] h3`)].map(
      (h) => h.textContent,
    );

  it('separa os registros em andamento dos encerrados, com o convocado primeiro', async () => {
    await respond(
      [
        report('r-open', 'OPEN'),
        report('r-summoned', 'SUMMONED'),
        report('r-done', 'COMPLETED'),
        report('r-expired', 'EXPIRED'),
      ],
      [SUMMONS],
    );

    expect(titles('ongoing-title')).toEqual(['Registro r-summoned', 'Registro r-open']);
    expect(titles('closed-title')).toEqual(['Registro r-done', 'Registro r-expired']);
    expect(page.textContent).toContain('2 de 5');
  });

  it('mostra onde, até quando e o que levar no registro convocado', async () => {
    await respond([report('r-summoned', 'SUMMONED')], [SUMMONS]);

    const card = page.querySelector('.report--summoned')!;
    expect(card.textContent).toContain('Busque no balcão até');
    expect(card.textContent).toContain(SUMMONS.place);
    expect(card.textContent).toContain(SUMMONS.hours);
    expect(card.textContent).toContain(SUMMONS.whatToBring);
  });

  it('mostra a situação escrita e a explicação de cada registro', async () => {
    await respond([report('r-open', 'OPEN', { statusLabel: 'Aberto' })]);

    expect(page.querySelector('.tag')?.textContent).toBe('Aberto');
    expect(page.querySelector('.tag')?.classList).toContain('tag--info');
    expect(page.textContent).toContain('Explicação de r-open');
    expect(page.textContent).toContain('Fica aberto até');
  });

  it('mostra o que a sala perguntou quando aguarda informações', async () => {
    await respond([
      report('r-info', 'AWAITING_INFO', { infoRequestReason: 'Qual é a cor da capa?' }),
    ]);

    expect(page.querySelector('.question')?.textContent).toContain('Qual é a cor da capa?');
  });

  it('convida a registrar quando não há nenhum registro', async () => {
    await respond([]);

    expect(page.querySelector('h2')?.textContent).toBe('Nenhum registro ainda');
    const links = [...page.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/student/losses/new']);
  });

  it('mostra o erro e deixa tentar de novo', async () => {
    await fixture.whenStable();
    http
      .expectOne('/api/loss-reports/mine')
      .flush({ detail: 'O sistema está fora do ar.' }, { status: 503, statusText: 'Unavailable' });
    // Com uma das chamadas falhando, a outra é cancelada: a tela não fica pela metade.
    expect(http.expectOne('/api/summons/mine').cancelled).toBe(true);
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'O sistema está fora do ar.',
    );

    page.querySelector<HTMLButtonElement>('button')!.click();
    await respond([report('r-open', 'OPEN')]);
    expect(titles('ongoing-title')).toEqual(['Registro r-open']);
  });
});
