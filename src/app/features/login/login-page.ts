import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { AuthApi } from '../../core/auth/auth-api';
import { homeFor } from '../../core/auth/role';
import { Session } from '../../core/auth/session';
import { ErrorMessage } from '../../shared/error-message/error-message';

/** Espera padrão entre dois pedidos de código, a mesma do back-end; o Retry-After da resposta tem preferência. */
const RESEND_INTERVAL_SECONDS = 60;
const INSTITUTIONAL_EMAIL = /@ucsal\.edu\.br$/i;

/**
 * Login sem senha em dois passos (RF01, D02): a pessoa informa o e-mail institucional, recebe um código de 6 dígitos
 * e troca o código pelo token de acesso. As validações daqui só ajudam a digitar; a regra (domínio, validade do
 * código, tentativas) é do back-end, e a mensagem dele é a que aparece.
 */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, ErrorMessage],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export default class LoginPage {
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  /** Página a abrir depois de entrar (query param, posto pela guarda de rota). */
  readonly returnUrl = input<string>();
  /** `expired` quando a pessoa chegou aqui porque a sessão venceu. */
  readonly reason = input<string>();

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email, Validators.pattern(INSTITUTIONAL_EMAIL)],
  });
  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });
  protected readonly emailForm = new FormGroup({ email: this.email });
  protected readonly codeForm = new FormGroup({ code: this.code });

  protected readonly step = signal<'email' | 'code'>('email');
  protected readonly sentTo = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly notice = signal<string | null>(null);
  /** Segundos até poder pedir outro código. */
  protected readonly waitSeconds = signal(0);

  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');
  private countdown: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.countdown));
  }

  protected requestCode(): void {
    this.email.markAsTouched();
    if (this.email.invalid || this.submitting() || this.waitSeconds() > 0) {
      return;
    }
    const email = this.email.value.trim();
    this.send(email, () => {
      this.sentTo.set(email);
      this.code.reset();
      this.step.set('code');
      this.focus(this.codeInput);
    });
  }

  protected resendCode(): void {
    if (this.submitting() || this.waitSeconds() > 0) {
      return;
    }
    this.send(this.sentTo(), () => {
      this.code.reset();
      this.notice.set('Enviamos um novo código. Use só o mais recente.');
      this.focus(this.codeInput);
    });
  }

  protected signIn(): void {
    this.code.markAsTouched();
    if (this.code.invalid || this.submitting()) {
      return;
    }
    this.begin();
    this.authApi
      .issueToken(this.sentTo(), this.code.value)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: ({ accessToken }) => {
          if (!this.session.start(accessToken)) {
            this.error.set(
              new ApiError('Não foi possível entrar. Peça um novo código e tente de novo.', -1),
            );
            return;
          }
          void this.router.navigateByUrl(this.destination());
        },
        error: (error: ApiError) => {
          this.error.set(error);
          this.code.reset();
          this.focus(this.codeInput);
        },
      });
  }

  /** Depois de um 429 no primeiro passo, a pessoa pode já ter um código válido de um pedido anterior. */
  protected useExistingCode(): void {
    this.email.markAsTouched();
    if (this.email.invalid) {
      return;
    }
    this.sentTo.set(this.email.value.trim());
    this.error.set(null);
    this.code.reset();
    this.step.set('code');
    this.focus(this.codeInput);
  }

  protected changeEmail(): void {
    clearInterval(this.countdown);
    this.waitSeconds.set(0);
    this.step.set('email');
    this.error.set(null);
    this.notice.set(null);
    this.focus(this.emailInput);
  }

  /** Mensagem do campo: a do back-end, se houver; senão, a da validação local depois que a pessoa tentou enviar. */
  protected fieldError(field: 'email' | 'code'): string | null {
    const serverMessage = this.error()?.fieldErrors[field];
    if (serverMessage) {
      return serverMessage;
    }
    const control = field === 'email' ? this.email : this.code;
    if (!control.touched || control.valid) {
      return null;
    }
    if (field === 'code') {
      return control.hasError('required') ? 'Informe o código.' : 'O código tem 6 dígitos.';
    }
    if (control.hasError('required')) {
      return 'Informe o seu e-mail.';
    }
    return control.hasError('email')
      ? 'Informe um e-mail válido.'
      : 'Use o seu e-mail @ucsal.edu.br.';
  }

  private send(email: string, onSent: () => void): void {
    this.begin();
    this.authApi
      .requestCode(email)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.startCountdown(RESEND_INTERVAL_SECONDS);
          onSent();
        },
        error: (error: ApiError) => {
          this.error.set(error);
          if (error.retryAfterSeconds) {
            this.startCountdown(error.retryAfterSeconds);
          }
        },
      });
  }

  private begin(): void {
    this.submitting.set(true);
    this.error.set(null);
    this.notice.set(null);
  }

  private startCountdown(seconds: number): void {
    clearInterval(this.countdown);
    this.waitSeconds.set(seconds);
    this.countdown = setInterval(() => {
      this.waitSeconds.update((left) => Math.max(left - 1, 0));
      if (this.waitSeconds() === 0) {
        clearInterval(this.countdown);
      }
    }, 1000);
  }

  private focus(target: () => ElementRef<HTMLInputElement> | undefined): void {
    afterNextRender(() => target()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Só aceita caminhos internos, para o link de login não servir de redirecionamento para outro site. */
  private destination(): string {
    const url = this.returnUrl();
    const safe = !!url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\');
    return safe && !url.startsWith('/login') ? url : homeFor(this.session.user()!.role);
  }
}
