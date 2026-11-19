import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fakeToken } from '../../../testing/fake-token';
import { ngrokInterceptor } from '../../core/api/ngrok-interceptor';
import { Session } from '../../core/auth/session';
import LoginPage from './login-page';

const EMAIL = 'estudante.teste@ucsal.edu.br';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let page: HTMLElement;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([ngrokInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPage);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  async function type(selector: string, value: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function goToCodeStep(): Promise<void> {
    await type('#email', `  ${EMAIL} `);
    await submit();
    http.expectOne('/api/auth/login-code').flush(null, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();
  }

  const text = () => page.textContent ?? '';
  const alert = () => page.querySelector('[role="alert"]')?.textContent?.trim();

  it('pede o código para o e-mail digitado e passa para o segundo passo', async () => {
    await type('#email', `  ${EMAIL} `);
    await submit();

    const request = http.expectOne('/api/auth/login-code');
    expect(request.request.body).toEqual({ email: EMAIL });
    request.flush(null, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();

    expect(page.querySelector('h1')?.textContent).toBe('Digite o código');
    expect(text()).toContain(EMAIL);
    expect(page.querySelector<HTMLInputElement>('#code')?.getAttribute('autocomplete')).toBe(
      'one-time-code',
    );
  });

  it('ajuda a digitar o e-mail sem chamar a API', async () => {
    await submit();
    expect(page.querySelector('#email-error')?.textContent).toBe('Informe o seu e-mail.');

    await type('#email', 'estudante@gmail.com');
    await submit();
    expect(page.querySelector('#email-error')?.textContent).toBe('Use o seu e-mail @ucsal.edu.br.');
    expect(page.querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');

    http.expectNone('/api/auth/login-code');
  });

  it('mostra a mensagem do back-end e a espera quando o código foi pedido há pouco', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await type('#email', EMAIL);
    await submit();

    http
      .expectOne('/api/auth/login-code')
      .flush(
        { detail: 'Um código acabou de ser enviado. Aguarde um minuto para pedir outro.' },
        { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '42' } },
      );
    await fixture.whenStable();

    expect(alert()).toBe('Um código acabou de ser enviado. Aguarde um minuto para pedir outro.');
    expect(page.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Aguarde 42 s');

    vi.advanceTimersByTime(42_000);
    await fixture.whenStable();
    expect(page.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Receber código');
  });

  it('depois do 429, deixa usar um código recebido antes', async () => {
    await type('#email', EMAIL);
    await submit();
    http
      .expectOne('/api/auth/login-code')
      .flush({ detail: 'Aguarde.' }, { status: 429, statusText: 'Too Many Requests' });
    await fixture.whenStable();

    [...page.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Já tenho um código'))!
      .click();
    await fixture.whenStable();

    expect(page.querySelector('h1')?.textContent).toBe('Digite o código');
  });

  it('troca o código pelo token, começa a sessão e abre a área do perfil', async () => {
    await goToCodeStep();
    const token = fakeToken({ role: 'STAFF' });

    await type('#code', '123456');
    await submit();
    const request = http.expectOne('/api/auth/token');
    expect(request.request.body).toEqual({ email: EMAIL, code: '123456' });
    request.flush({ accessToken: token, tokenType: 'Bearer', expiresIn: 28800 });
    await fixture.whenStable();

    expect(TestBed.inject(Session).token()).toBe(token);
    expect(navigate).toHaveBeenCalledWith('/staff');
  });

  it('volta para a página pedida antes do login', async () => {
    fixture.componentRef.setInput('returnUrl', '/student/losses');
    await goToCodeStep();

    await type('#code', '123456');
    await submit();
    http
      .expectOne('/api/auth/token')
      .flush({ accessToken: fakeToken(), tokenType: 'Bearer', expiresIn: 1 });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/student/losses');
  });

  it.each(['https://example.com', '//example.com', '/\\example.com'])(
    'ignora o endereço externo %s',
    async (returnUrl) => {
      fixture.componentRef.setInput('returnUrl', returnUrl);
      await goToCodeStep();

      await type('#code', '123456');
      await submit();
      http
        .expectOne('/api/auth/token')
        .flush({ accessToken: fakeToken(), tokenType: 'Bearer', expiresIn: 1 });
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith('/student');
    },
  );

  it('mostra o erro do código recusado e limpa o campo', async () => {
    await goToCodeStep();

    await type('#code', '000000');
    await submit();
    http
      .expectOne('/api/auth/token')
      .flush(
        { detail: 'Código inválido ou expirado. Confira o código ou solicite um novo.' },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(alert()).toBe('Código inválido ou expirado. Confira o código ou solicite um novo.');
    expect(page.querySelector<HTMLInputElement>('#code')?.value).toBe('');
    expect(TestBed.inject(Session).user()).toBeNull();
  });

  it('não envia código com formato errado', async () => {
    await goToCodeStep();

    await type('#code', '12a');
    await submit();

    expect(page.querySelector('#code-error')?.textContent).toBe('O código tem 6 dígitos.');
    http.expectNone('/api/auth/token');
  });

  it('reenvia o código depois da espera', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await goToCodeStep();
    const resend = () =>
      [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
        b.textContent?.includes('Reenviar'),
      )!;
    expect(resend().disabled).toBe(true);

    vi.advanceTimersByTime(60_000);
    await fixture.whenStable();
    resend().click();
    http.expectOne('/api/auth/login-code').flush(null, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();

    expect(page.querySelector('[role="status"]')?.textContent).toContain('Enviamos um novo código');
  });

  it('avisa quando a sessão expirou', async () => {
    fixture.componentRef.setInput('reason', 'expired');
    await fixture.whenStable();

    expect(text()).toContain('Sua sessão expirou');
  });

  it('volta ao primeiro passo para usar outro e-mail', async () => {
    await goToCodeStep();

    [...page.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Usar outro e-mail'))!
      .click();
    await fixture.whenStable();

    expect(page.querySelector('h1')?.textContent).toBe('Entrar');
  });
});
