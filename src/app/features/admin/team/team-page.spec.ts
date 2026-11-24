import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Account } from './account';
import TeamPage from './team-page';

const STAFF: Account = {
  id: 'u-staff',
  email: 'funcionario.teste@ucsal.edu.br',
  role: 'STAFF',
  createdAt: '2026-11-01T12:00:00Z',
};
const STUDENT: Account = {
  id: 'u-student',
  email: 'maria.teste@ucsal.edu.br',
  role: 'STUDENT',
  createdAt: '2026-11-02T12:00:00Z',
};

const page = (content: Account[]) => ({
  content,
  page: { size: 50, number: 0, totalElements: content.length, totalPages: 1 },
});

describe('TeamPage', () => {
  let fixture: ComponentFixture<TeamPage>;
  let element: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TeamPage);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    staffRequest().flush(page([STAFF]));
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function staffRequest() {
    return http.expectOne((r) => r.url === '/api/users' && r.params.get('role') === 'STAFF');
  }

  const button = (text: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    )!;

  async function click(text: string): Promise<void> {
    button(text).click();
    await fixture.whenStable();
  }

  async function type(selector: string, text: string): Promise<void> {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('lista os funcionários', () => {
    expect(element.querySelector('.account__email')?.textContent).toBe(STAFF.email);
  });

  it('retira o perfil só depois de confirmar e com motivo', async () => {
    await click('Retirar perfil');
    expect(element.querySelector('.panel')?.textContent).toContain(
      'Retirar o perfil de funcionário?',
    );

    await click('Confirmar retirada');
    expect(element.querySelector('#reason-error')?.textContent).toBe('Informe o motivo.');
    http.expectNone((r) => r.method === 'PUT');

    await type('#reason', 'Saiu da equipe');
    await click('Confirmar retirada');
    const request = http.expectOne({ method: 'PUT', url: '/api/users/u-staff/role' });
    expect(request.request.body).toEqual({ role: 'STUDENT', reason: 'Saiu da equipe' });
    request.flush({ ...STAFF, role: 'STUDENT' });
    await fixture.whenStable();
    staffRequest().flush(page([]));
    await fixture.whenStable();

    expect(element.querySelector('#notice')?.textContent).toContain('não é mais funcionário');
    expect(element.querySelector('.empty')?.textContent).toContain('Ninguém tem o perfil');
  });

  it('acha a conta pelo e-mail e dá o perfil de funcionário', async () => {
    await type('#email', 'maria');
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    const search = http.expectOne(
      (r) => r.url === '/api/users' && r.params.get('email') === 'maria',
    );
    search.flush(page([STUDENT]));
    await fixture.whenStable();

    await click('Tornar funcionário');
    await type('#reason', 'Entrou na equipe');
    await click('Confirmar');
    const request = http.expectOne({ method: 'PUT', url: '/api/users/u-student/role' });
    expect(request.request.body).toEqual({ role: 'STAFF', reason: 'Entrou na equipe' });
    request.flush({ ...STUDENT, role: 'STAFF' });
    await fixture.whenStable();
    staffRequest().flush(page([STAFF, { ...STUDENT, role: 'STAFF' }]));
    await fixture.whenStable();

    expect(element.querySelector('#notice')?.textContent).toContain('agora é funcionário');
  });

  it('pede pelo menos 3 letras para buscar', async () => {
    await type('#email', 'ma');
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(element.querySelector('#email-error')?.textContent).toBe(
      'Digite pelo menos 3 letras do e-mail.',
    );
    http.expectNone((r) => r.params.has('email'));
  });

  it('explica quando nenhuma conta tem o e-mail', async () => {
    await type('#email', 'ninguem');
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    http.expectOne((r) => r.params.get('email') === 'ninguem').flush(page([]));
    await fixture.whenStable();

    expect(element.textContent).toContain('Peça para a pessoa entrar uma vez');
  });
});
