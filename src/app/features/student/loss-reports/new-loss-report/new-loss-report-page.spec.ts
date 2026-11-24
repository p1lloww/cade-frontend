import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import NewLossReportPage from './new-loss-report-page';

const CATEGORIES = [
  { id: 'c-fone', name: 'Fone' },
  { id: 'c-garrafa', name: 'Garrafa' },
];

const REGISTERED = {
  id: 'r1',
  categoryName: 'Fone',
  description: 'Fone JBL preto',
  locationsLabel: 'Bloco 400, Sala 421',
  lostFrom: '2026-11-20',
  lostUntil: null,
  shiftLabel: 'Noite',
  status: 'OPEN',
  statusLabel: 'Aberto',
  statusDescription: 'Estamos de olho: quando chegar um objeto parecido, você é avisado.',
  registeredAt: '2026-11-23T12:00:00Z',
  expiresAt: '2026-12-23T12:00:00Z',
  version: 0,
};

describe('NewLossReportPage', () => {
  let fixture: ComponentFixture<NewLossReportPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NewLossReportPage);
    page = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/categories').flush(CATEGORIES);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function type(selector: string, value: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function check(label: string): Promise<void> {
    const choice = [...page.querySelectorAll('label.choice')].find(
      (l) => l.textContent?.trim() === label,
    )!;
    choice.querySelector<HTMLInputElement>('input')!.click();
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function sentReport(): Promise<Record<string, unknown>> {
    const request = http.expectOne('/api/loss-reports');
    expect(request.request.method).toBe('POST');
    const part = (request.request.body as FormData).get('report') as Blob;
    expect(part.type).toBe('application/json');
    const body = JSON.parse(await part.text()) as Record<string, unknown>;
    request.flush(REGISTERED, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    return body;
  }

  it('mostra as categorias para escolher', () => {
    const names = [...page.querySelectorAll('.choices')][0].textContent;
    expect(names).toContain('Fone');
    expect(names).toContain('Garrafa');
  });

  it('explica que o detalhe secreto não aparece para outros estudantes', () => {
    expect(page.querySelector('#secret-hint')?.textContent).toContain(
      'Outros estudantes nunca veem',
    );
  });

  it('registra a perda com todos os dados e mostra a situação', async () => {
    await check('Fone');
    await type('#description', '  Fone JBL preto ');
    await type('#block-0', 'Bloco 400');
    await type('#room-0', 'Sala 421');
    await type('#lostFrom', '2026-11-20');
    await check('Noite');
    await type('#secretDetail', 'Adesivo de estrela');
    await submit();

    expect(await sentReport()).toEqual({
      categoryId: 'c-fone',
      description: 'Fone JBL preto',
      secretDetail: 'Adesivo de estrela',
      locations: [{ block: 'Bloco 400', room: 'Sala 421' }],
      lostFrom: '2026-11-20',
      lostUntil: null,
      shift: 'EVENING',
    });
    expect(page.querySelector('h1')?.textContent).toBe('Perda registrada');
    expect(page.textContent).toContain(REGISTERED.statusDescription);
  });

  it('envia só o obrigatório quando a pessoa não lembra do resto', async () => {
    await check('Garrafa');
    await type('#description', 'Garrafa azul');
    page.querySelector<HTMLButtonElement>('.quick-dates button')!.click();
    await fixture.whenStable();
    await submit();

    const body = await sentReport();
    expect(body['locations']).toEqual([]);
    expect(body['shift']).toBeNull();
    expect(body['secretDetail']).toBeNull();
    expect(body['lostFrom']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('ajuda a preencher sem chamar a API', async () => {
    await type('#room-0', 'Sala 421');
    await submit();

    expect(page.querySelector('#categoryId-error')?.textContent).toBe('Escolha a categoria.');
    expect(page.querySelector('#description-error')?.textContent).toBe('Descreva o objeto.');
    expect(page.querySelector('#lostFrom-error')?.textContent).toBe(
      'Informe quando perdeu o objeto.',
    );
    expect(page.querySelector('#locations-0-block-error')?.textContent).toBe('Informe o bloco.');
    expect(page.querySelector('#description')?.getAttribute('aria-invalid')).toBe('true');
    http.expectNone('/api/loss-reports');

    await type('#description', 'Fone');
    expect(page.querySelector('#description-error')).toBeNull();
  });

  it('confere o período de no máximo 30 dias', async () => {
    await check('Fone');
    await type('#description', 'Fone');
    await check('Entre duas datas');
    await type('#lostFrom', '2026-09-01');
    await type('#lostUntil', '2026-10-15');
    await submit();

    expect(page.querySelector('#lostUntil-error')?.textContent).toBe(
      'O período pode ter no máximo 30 dias.',
    );
    http.expectNone('/api/loss-reports');
  });

  it('adiciona e remove locais, até 5', async () => {
    const add = () =>
      [...page.querySelectorAll('button')].find((b) => b.textContent?.includes('Outro local'));
    for (let i = 0; i < 4; i++) {
      add()!.click();
      await fixture.whenStable();
    }
    expect(page.querySelectorAll('.location').length).toBe(5);
    expect(add()).toBeUndefined();

    page.querySelector<HTMLButtonElement>('[aria-label="Remover o local 2"]')!.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('.location').length).toBe(4);
  });

  it('mostra a mensagem do back-end quando o registro é recusado', async () => {
    await check('Fone');
    await type('#description', 'Fone');
    await type('#lostFrom', '2026-11-20');
    await submit();

    http
      .expectOne('/api/loss-reports')
      .flush(
        { detail: 'Você já tem 5 registros em andamento.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Você já tem 5 registros em andamento.',
    );
    expect(page.querySelector('h1')?.textContent).toBe('Registrar perda');
  });

  it('volta ao formulário vazio para registrar outra perda', async () => {
    await check('Fone');
    await type('#description', 'Fone');
    await type('#lostFrom', '2026-11-20');
    await submit();
    await sentReport();

    [...page.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Registrar outra perda'))!
      .click();
    await fixture.whenStable();

    expect(page.querySelector<HTMLTextAreaElement>('#description')?.value).toBe('');
  });
});
