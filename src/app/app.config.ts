import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { ngrokInterceptor } from './core/api/ngrok-interceptor';
import { authInterceptor } from './core/auth/auth-interceptor';
import { CadePreset } from './core/theme/primeng-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Cada tela nova abre no topo; o "voltar" do navegador devolve a posição de antes.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([ngrokInterceptor, authInterceptor])),
    providePrimeNG({
      license: environment.primengLicense,
      theme: {
        preset: CadePreset,
        options: {
          // O site é só no modo claro (color-scheme: light em styles.scss).
          darkModeSelector: '.app-dark',
          // Em camada: os estilos do projeto, fora de camada, sempre têm prioridade.
          cssLayer: { name: 'primeng' },
        },
      },
    }),
  ],
};
