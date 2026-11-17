import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeToken } from '../../../testing/fake-token';
import { authInterceptor } from './auth-interceptor';
import { Session } from './session';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let session: Session;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(Session);
  });

  afterEach(() => http.verify());

  it('envia o token no header Authorization das chamadas à API', () => {
    const token = fakeToken();
    session.start(token);

    client.get('/api/items').subscribe();

    expect(http.expectOne('/api/items').request.headers.get('Authorization')).toBe(
      `Bearer ${token}`,
    );
  });

  it('não envia o token para outros endereços', () => {
    session.start(fakeToken());

    client.get('https://example.com/api/items').subscribe();

    expect(
      http.expectOne('https://example.com/api/items').request.headers.has('Authorization'),
    ).toBe(false);
  });

  it('não envia nada sem sessão', () => {
    client.get('/api/items').subscribe();

    expect(http.expectOne('/api/items').request.headers.has('Authorization')).toBe(false);
  });

  it('encerra a sessão quando o back-end recusa o token', () => {
    session.start(fakeToken());
    const expire = vi.spyOn(session, 'expire');

    client.get('/api/items').subscribe({ error: () => undefined });
    http
      .expectOne('/api/items')
      .flush({ detail: 'Entre de novo.' }, { status: 401, statusText: 'Unauthorized' });

    expect(expire).toHaveBeenCalled();
  });

  it('mantém a sessão em outros erros, como o 403 de perfil sem permissão', () => {
    session.start(fakeToken());
    const expire = vi.spyOn(session, 'expire');

    client.get('/api/items').subscribe({ error: () => undefined });
    http
      .expectOne('/api/items')
      .flush({ detail: 'Sem permissão.' }, { status: 403, statusText: 'Forbidden' });

    expect(expire).not.toHaveBeenCalled();
    expect(session.isActive()).toBe(true);
  });
});
