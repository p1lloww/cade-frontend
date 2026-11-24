import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { lossReportFixture } from '../../../../../testing/loss-report-fixture';
import { LossReport } from '../loss-report';
import LossReportDetailPage from './loss-report-detail-page';

describe('LossReportDetailPage', () => {
  let fixture: ComponentFixture<LossReportDetailPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LossReportDetailPage);
    fixture.componentRef.setInput('id', 'r1');
    page = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    http
      .match((r) => r.url.includes('/proof') && r.method === 'GET')
      .forEach((r) => r.flush(new Blob()));
    http.verify();
  });

  async function load(report: LossReport, summons: unknown[] = []): Promise<void> {
    await fixture.whenStable();
    http.expectOne('/api/loss-reports/mine').flush([report]);
    http.expectOne('/api/summons/mine').flush(summons);
    await fixture.whenStable();
  }

  const button = (text: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    );

  async function click(text: string): Promise<void> {
    button(text)!.click();
    await fixture.whenStable();
  }

  async function type(selector: string, text: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('responde ao pedido de mais informações', async () => {
    await load(
      lossReportFixture({
        status: 'AWAITING_INFO',
        statusLabel: 'Aguardando informações',
        infoRequestReason: 'Qual é a cor da capa?',
      }),
    );
    expect(page.querySelector('.question')?.textContent).toBe('Qual é a cor da capa?');

    await click('Enviar resposta');
    expect(page.querySelector('#answer-error')?.textContent).toBe('Escreva a resposta.');

    await type('#answer', 'Transparente, com um adesivo');
    await click('Enviar resposta');
    const request = http.expectOne({ method: 'POST', url: '/api/loss-reports/r1/info-response' });
    expect(request.request.body).toEqual({ answer: 'Transparente, com um adesivo' });
    request.flush(lossReportFixture({ infoAnswer: 'Transparente, com um adesivo' }));
    await fixture.whenStable();

    expect(page.querySelector('#notice')?.textContent).toContain('Resposta enviada');
    expect(page.querySelector('.box--question')).toBeNull();
  });

  it('renova o registro aberto', async () => {
    await load(lossReportFixture());
    await click('Renovar por mais 30 dias');

    http
      .expectOne({ method: 'POST', url: '/api/loss-reports/r1/renew' })
      .flush(lossReportFixture({ expiresAt: '2026-12-30T12:00:00Z' }));
    await fixture.whenStable();
    expect(page.querySelector('#notice')?.textContent).toContain('renovado');
  });

  it('cancela só depois de confirmar', async () => {
    await load(lossReportFixture());
    await click('Cancelar o registro');
    http.expectNone('/api/loss-reports/r1/cancel');

    await click('Sim, cancelar');
    http
      .expectOne({ method: 'POST', url: '/api/loss-reports/r1/cancel' })
      .flush(lossReportFixture({ status: 'CANCELLED', statusLabel: 'Cancelado' }));
    await fixture.whenStable();

    expect(page.querySelector('.tag')?.textContent).toBe('Cancelado');
    expect(button('Renovar')).toBeUndefined();
    expect(page.querySelector('#proof-title')).toBeNull();
  });

  it('anexa o número de série como prova', async () => {
    await load(lossReportFixture());
    await click('Salvar prova');
    expect(page.textContent).toContain('Escolha uma foto ou informe o número de série.');

    await type('#serialNumber', 'SN-123');
    await click('Salvar prova');
    const request = http.expectOne({ method: 'POST', url: '/api/loss-reports/r1/proof' });
    const part = (request.request.body as FormData).get('proof') as Blob;
    expect(JSON.parse(await part.text())).toEqual({ serialNumber: 'SN-123' });
    expect((request.request.body as FormData).has('file')).toBe(false);
    request.flush(lossReportFixture({ proofSerialNumber: 'SN-123' }));
    await fixture.whenStable();

    expect(page.querySelector('.current')?.textContent).toContain('SN-123');
  });

  it('mostra onde e até quando retirar quando convocado, sem opções de cancelar', async () => {
    await load(lossReportFixture({ status: 'SUMMONED', statusLabel: 'Convocado' }), [
      {
        id: 's1',
        lossReportId: 'r1',
        summonedAt: '',
        expiresAt: '2026-11-30T12:00:00Z',
        place: 'Sala de achados',
        hours: '7h às 21h50',
        whatToBring: 'Documento com foto',
      },
    ]);

    expect(page.querySelector('.box--pickup')?.textContent).toContain('Sala de achados');
    expect(button('Cancelar o registro')).toBeUndefined();
    expect(page.querySelector('#proof-title')).not.toBeNull();
  });

  it('avisa quando o registro não é do estudante ou não existe', async () => {
    await fixture.whenStable();
    http.expectOne('/api/loss-reports/mine').flush([]);
    http.expectOne('/api/summons/mine').flush([]);
    await fixture.whenStable();

    expect(page.querySelector('h1')?.textContent).toBe('Registro não encontrado');
  });
});
