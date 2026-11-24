import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { counterSummonsFixture } from '../../../../../testing/counter-fixture';
import { suggestionFixture } from '../../../../../testing/suggestion-fixture';
import CounterSummonsPage from './counter-summons-page';

describe('CounterSummonsPage', () => {
  let fixture: ComponentFixture<CounterSummonsPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CounterSummonsPage);
    fixture.componentRef.setInput('id', 'c1');
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    http.expectOne('/api/summons/c1').flush(counterSummonsFixture());
    await fixture.whenStable();
    http.expectOne('/api/suggestions/s1').flush(suggestionFixture());
    await fixture.whenStable();
  });

  afterEach(() => {
    http.match((r) => r.url.endsWith('/photo')).forEach((r) => r.flush(new Blob()));
    http.verify();
  });

  const button = (text: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    )!;

  async function click(text: string): Promise<void> {
    button(text).click();
    await fixture.whenStable();
  }

  async function type(selector: string, text: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function pick(text: string): Promise<void> {
    const label = [...page.querySelectorAll('label')].find((l) => l.textContent?.trim() === text)!;
    label.querySelector('input')!.click();
    await fixture.whenStable();
  }

  it('mostra onde pegar o objeto, o que conferir e o detalhe dos dois lados', () => {
    expect(page.querySelector('.item__box')?.textContent).toContain('Caixa Novembro/2026');
    const checklist = [...page.querySelectorAll('.checklist li')].map((li) => li.textContent);
    expect(checklist).toHaveLength(2);
    expect(page.querySelector('.compare')?.textContent).toContain('Meu nome gravado na tampa');
    expect(page.querySelector('.compare')?.textContent).toContain('Nome gravado na tampa');
    const options = [...page.querySelectorAll('.option')].map((o) => o.textContent?.trim());
    expect(options).toEqual([
      'Detalhe que não aparece na foto, ou o detalhe reservado',
      'Prova de que o objeto é dele',
    ]);
  });

  it('confere os campos antes de pedir a confirmação', async () => {
    await click('Entregar o objeto');

    expect(page.querySelector('#documentType-error')?.textContent).toBe(
      'Informe o tipo do documento com foto.',
    );
    expect(page.querySelector('#documentNumber-error')?.textContent).toBe(
      'Informe o número do documento.',
    );
    expect(page.querySelector('#enrollment-error')?.textContent).toBe('Informe a matrícula.');
    expect(page.querySelector('#verification-error')?.textContent).toBe(
      'Informe a verificação feita.',
    );
    expect(page.querySelector('#confirm-pickup')).toBeNull();
  });

  it('registra a retirada depois de confirmar', async () => {
    await pick('Carteirinha da UCSal');
    await type('#documentNumber', ' 123456 ');
    await type('#enrollment', '2026001');
    await pick('Detalhe que não aparece na foto, ou o detalhe reservado');
    await click('Entregar o objeto');
    expect(page.textContent).toContain('Confirmar a entrega?');
    http.expectNone('/api/summons/c1/pickup');

    await click('Confirmar entrega');
    const request = http.expectOne({ method: 'POST', url: '/api/summons/c1/pickup' });
    expect(request.request.body).toEqual({
      documentType: 'STUDENT_CARD',
      documentNumber: '123456',
      enrollment: '2026001',
      verification: 'DETAIL_CONFIRMED',
      notes: null,
    });
    request.flush({}, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(page.querySelector('#result h2')?.textContent).toBe('Objeto entregue');
  });

  it('registra a recusa com motivo e mostra a contagem do estudante', async () => {
    await click('recusar');
    await click('Confirmar recusa');
    expect(page.querySelector('#reason-error')?.textContent).toBe('Informe o motivo.');

    await type('#refusal-reason', 'Não soube dizer o detalhe');
    await click('Confirmar recusa');
    const request = http.expectOne('/api/summons/c1/refusal');
    expect(request.request.body).toEqual({ reason: 'Não soube dizer o detalhe' });
    request.flush({ studentRefusals: 3, studentBlocked: true });
    await fixture.whenStable();

    expect(page.querySelector('#result')?.textContent).toContain('Esta é a recusa 3 de 3');
    expect(page.querySelector('.blocked')?.textContent).toContain('O estudante foi bloqueado');
  });

  it('mostra a recusa do back-end e volta aos campos', async () => {
    await pick('RG');
    await type('#documentNumber', '123');
    await type('#enrollment', '2026001');
    await pick('Prova de que o objeto é dele');
    await click('Entregar o objeto');
    await click('Confirmar entrega');
    http
      .expectOne('/api/summons/c1/pickup')
      .flush(
        { detail: 'Confira os campos.', errors: { verification: 'Essa verificação não basta.' } },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Confira os campos.');
    expect(page.querySelector('#verification-error')?.textContent).toBe(
      'Essa verificação não basta.',
    );
  });
});
