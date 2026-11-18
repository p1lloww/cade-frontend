import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NGROK_HEADER, ngrokInterceptor } from './ngrok-interceptor';

describe('ngrokInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([ngrokInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('não envia o header para endereços fora da API', () => {
    client.get('https://example.com/api/x').subscribe();
    client.get('/apis/x').subscribe();

    expect(http.expectOne('https://example.com/api/x').request.headers.has(NGROK_HEADER)).toBe(
      false,
    );
    expect(http.expectOne('/apis/x').request.headers.has(NGROK_HEADER)).toBe(false);
  });
});
