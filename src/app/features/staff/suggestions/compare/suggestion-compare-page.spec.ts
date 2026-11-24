import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { suggestionFixture } from '../../../../../testing/suggestion-fixture';
import SuggestionComparePage from './suggestion-compare-page';

describe('SuggestionComparePage', () => {
  let fixture: ComponentFixture<SuggestionComparePage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SuggestionComparePage);
    fixture.componentRef.setInput('id', 's1');
    page = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    http
      .match((r) => r.url.endsWith('/photo') || r.url.endsWith('/proof'))
      .forEach((r) => r.flush(new Blob()));
    http.verify();
  });

  async function load(suggestion = suggestionFixture()): Promise<void> {
    await fixture.whenStable();
    http.expectOne('/api/suggestions/s1').flush(suggestion);
    await fixture.whenStable();
  }

  const button = (text: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    )!;

  async function click(text: string): Promise<void> {
    button(text).click();
    await fixture.whenStable();
  }

  async function type(text: string): Promise<void> {
    const reason = page.querySelector<HTMLTextAreaElement>('#reason')!;
    reason.value = text;
    reason.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('mostra o objeto e a perda lado a lado, com a faixa escrita', async () => {
    await load();

    const row = (label: string) =>
      [...page.querySelectorAll('tbody tr')]
        .find((r) => r.querySelector('th')?.textContent?.trim() === label)!
        .querySelectorAll('td');
    const [itemSecret, lossSecret] = row('O que só o dono saberia');
    expect(itemSecret.textContent?.trim()).toBe('Nome gravado na tampa');
    expect(lossSecret.textContent?.trim()).toBe('Meu nome gravado na tampa');
    expect(row('Quando')[1].textContent).toContain('Noite');
    expect(page.querySelector('.where')?.textContent).toContain('Caixa Novembro/2026');
    expect(page.querySelector('.title .tag')?.textContent).toContain(
      'Compatibilidade alta · 90 de 100',
    );
    expect(page.querySelector('.photos app-api-photo')).not.toBeNull();
  });

  it('convoca o estudante depois de confirmar', async () => {
    await load();
    await click('Convocar estudante');
    expect(page.textContent).toContain('O objeto fica reservado');

    await click('Confirmar convocação');
    http.expectOne({ method: 'POST', url: '/api/suggestions/s1/summon' }).flush(
      {
        id: 'c1',
        expiresAt: '2026-11-30T12:00:00Z',
        place: 'Sala de achados e perdidos',
        hours: 'Das 7h às 21h50',
        whatToBring: 'Um documento com foto.',
      },
      { status: 201, statusText: 'Created' },
    );
    await fixture.whenStable();
    http
      .expectOne('/api/suggestions/s1')
      .flush(suggestionFixture({ status: 'SUMMONED', statusLabel: 'Convocada' }));
    await fixture.whenStable();

    expect(page.querySelector('#notice')?.textContent).toContain('Estudante convocado');
    expect(page.querySelector('#notice')?.textContent).toContain('Um documento com foto.');
    expect(page.querySelector('.decisions')).toBeNull();
  });

  it('exige o motivo para descartar e envia o motivo escrito', async () => {
    await load();
    await click('Descartar');
    await click('Descartar sugestão');
    expect(page.querySelector('#reason-error')?.textContent).toBe('Informe o motivo.');
    http.expectNone('/api/suggestions/s1/discard');

    await type('  Cor diferente  ');
    await click('Descartar sugestão');
    const request = http.expectOne('/api/suggestions/s1/discard');
    expect(request.request.body).toEqual({ reason: 'Cor diferente' });
    request.flush(suggestionFixture({ status: 'DISCARDED', statusLabel: 'Descartada' }));
    await fixture.whenStable();
    http
      .expectOne('/api/suggestions/s1')
      .flush(suggestionFixture({ status: 'DISCARDED', statusLabel: 'Descartada' }));
    await fixture.whenStable();

    expect(page.querySelector('#notice')?.textContent).toContain('Sugestão descartada');
  });

  it('pede mais informações com a pergunta escrita', async () => {
    await load();
    await click('Pedir mais informações');
    await click('Enviar pergunta');
    expect(page.querySelector('#reason-error')?.textContent).toBe(
      'Informe o que você precisa saber.',
    );

    await type('A capa tem alguma marca?');
    await click('Enviar pergunta');
    const request = http.expectOne('/api/suggestions/s1/info-request');
    expect(request.request.body).toEqual({ reason: 'A capa tem alguma marca?' });
    request.flush(suggestionFixture());
    await fixture.whenStable();
    http.expectOne('/api/suggestions/s1').flush(suggestionFixture());
    await fixture.whenStable();

    expect(page.querySelector('#notice')?.textContent).toContain('Pedido enviado');
  });

  it('mostra a recusa do back-end sem fechar a decisão', async () => {
    await load();
    await click('Convocar estudante');
    await click('Confirmar convocação');
    http
      .expectOne('/api/suggestions/s1/summon')
      .flush({ detail: 'O objeto já está reservado.' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'O objeto já está reservado.',
    );
    expect(button('Confirmar convocação')).toBeDefined();
  });

  it('não oferece decisão quando a sugestão não é mais nova', async () => {
    await load(suggestionFixture({ status: 'SUMMONED', statusLabel: 'Convocada' }));

    expect(page.querySelector('.decisions')).toBeNull();
    expect(page.textContent).toContain('Esta sugestão está convocada');
  });
});
