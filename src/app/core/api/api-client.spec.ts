import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from './api-client';
import { ApiError } from './api-error';
import { NGROK_HEADER, ngrokInterceptor } from './ngrok-interceptor';

describe('ApiClient', () => {
  let api: ApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([ngrokInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('chama a rota a partir do endereço da API, com os parâmetros', async () => {
    const response = firstValueFrom(api.get<string[]>('/items', { page: 2 }));

    const request = http.expectOne('/api/items?page=2');
    expect(request.request.method).toBe('GET');
    request.flush(['a']);
    expect(await response).toEqual(['a']);
  });

  it('envia o header do ngrok nas chamadas à API', () => {
    api.post('/auth/login-code', { email: 'a@ucsal.edu.br' }).subscribe();

    const request = http.expectOne('/api/auth/login-code');
    expect(request.request.headers.get(NGROK_HEADER)).toBe('true');
    expect(request.request.body).toEqual({ email: 'a@ucsal.edu.br' });
    request.flush(null, { status: 202, statusText: 'Accepted' });
  });

  it('transforma a falha num ApiError com a mensagem do back-end', async () => {
    const response = firstValueFrom(api.post('/auth/token', {}));

    http
      .expectOne('/api/auth/token')
      .flush(
        { detail: 'Código inválido ou expirado.' },
        { status: 400, statusText: 'Bad Request' },
      );

    const error = await response.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('Código inválido ou expirado.');
  });

  it('baixa arquivos como blob', async () => {
    const response = firstValueFrom(api.getBlob('/items/1/photo'));

    const request = http.expectOne('/api/items/1/photo');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['x']));
    expect(await response).toBeInstanceOf(Blob);
  });
});
