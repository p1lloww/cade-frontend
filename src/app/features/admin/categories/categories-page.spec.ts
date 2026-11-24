import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import CategoriesPage from './categories-page';

const FONE = {
  id: 'c-fone',
  name: 'Fone',
  defaultRisk: 'MEDIUM',
  defaultRiskLabel: 'Médio',
  verificationQuestions: ['Qual é a marca?'],
};

describe('CategoriesPage', () => {
  let fixture: ComponentFixture<CategoriesPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CategoriesPage);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    http.expectOne('/api/categories').flush([FONE]);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const button = (text: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.trim().startsWith(text),
    )!;

  async function click(text: string): Promise<void> {
    button(text).click();
    await fixture.whenStable();
  }

  async function type(selector: string, text: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement>(selector)!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('lista as categorias com o risco escrito e o número de perguntas', () => {
    const row = page.querySelector('.category')!;
    expect(row.textContent).toContain('Fone');
    expect(row.querySelector('.tag')?.textContent?.trim()).toBe('Risco médio');
    expect(row.textContent).toContain('1 pergunta');
  });

  it('cria uma categoria com risco e perguntas, sem as perguntas vazias', async () => {
    await click('Nova categoria');
    await submit();
    expect(page.querySelector('#new-name-error')?.textContent).toBe('Informe o nome da categoria.');

    await type('#new-name', ' Instrumento musical ');
    const high = [...page.querySelectorAll('.risk')].find((l) => l.textContent?.includes('Alto'))!;
    high.querySelector('input')!.click();
    await click('+ Pergunta');
    await click('+ Pergunta');
    await type('#new-q0', 'Qual é a marca do estojo?');
    await submit();

    const request = http.expectOne({ method: 'POST', url: '/api/categories' });
    expect(request.request.body).toEqual({
      name: 'Instrumento musical',
      defaultRisk: 'HIGH',
      verificationQuestions: ['Qual é a marca do estojo?'],
    });
    request.flush({
      id: 'c-inst',
      name: 'Instrumento musical',
      defaultRisk: 'HIGH',
      defaultRiskLabel: 'Alto',
      verificationQuestions: ['Qual é a marca do estojo?'],
    });
    await fixture.whenStable();

    expect(page.querySelector('[role="status"]')?.textContent).toContain('Instrumento musical');
    expect(page.querySelectorAll('.category')).toHaveLength(2);
  });

  it('edita a categoria a partir dos dados atuais', async () => {
    await click('Editar');
    expect(page.querySelector<HTMLInputElement>('#c0-name')?.value).toBe('Fone');
    expect(page.querySelector<HTMLInputElement>('#c0-q0')?.value).toBe('Qual é a marca?');

    await type('#c0-name', 'Fone de ouvido');
    await submit();
    const request = http.expectOne({ method: 'PUT', url: '/api/categories/c-fone' });
    expect(request.request.body).toEqual({
      name: 'Fone de ouvido',
      defaultRisk: 'MEDIUM',
      verificationQuestions: ['Qual é a marca?'],
    });
    request.flush({ ...FONE, name: 'Fone de ouvido' });
    await fixture.whenStable();

    expect(page.querySelector('.category__name')?.textContent).toBe('Fone de ouvido');
  });

  it('mostra a recusa do back-end quando o nome já existe', async () => {
    await click('Nova categoria');
    await type('#new-name', 'fone');
    await submit();
    http
      .expectOne({ method: 'POST', url: '/api/categories' })
      .flush(
        { detail: 'Já existe uma categoria com esse nome.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Já existe uma categoria com esse nome.',
    );
  });
});
