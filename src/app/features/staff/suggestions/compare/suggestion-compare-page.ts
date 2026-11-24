import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiError } from '../../../../core/api/api-error';
import { ErrorMessage } from '../../../../shared/error-message/error-message';
import { formatDate, formatDay, formatPeriod } from '../../../../shared/format/dates';
import { ApiPhoto } from '../../../../shared/photo/api-photo';
import { BAND_TAG, IssuedSummons, Suggestion } from '../suggestion';
import { SuggestionApi } from '../suggestion-api';

type Decision = 'summon' | 'info' | 'discard';

const MAX_REASON_LENGTH = 500;

/**
 * Comparação lado a lado de uma sugestão (RF23): foto e dados do objeto contra a descrição e o detalhe secreto do
 * estudante. O funcionário decide (RF24): convocar, pedir mais informações ou descartar; os dois últimos exigem
 * motivo. Só a sugestão Nova aceita decisão; a regra é do back-end, que responde 409 se algo mudou no caminho.
 */
@Component({
  selector: 'app-suggestion-compare-page',
  host: { class: 'page page--wide' },
  imports: [ReactiveFormsModule, RouterLink, ErrorMessage, ApiPhoto],
  templateUrl: './suggestion-compare-page.html',
  styleUrl: './suggestion-compare-page.scss',
})
export default class SuggestionComparePage {
  private readonly suggestionApi = inject(SuggestionApi);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Id da sugestão, da rota. */
  readonly id = input.required<string>();

  protected readonly bandTag = BAND_TAG;
  protected readonly formatDay = formatDay;
  protected readonly formatDate = formatDate;
  protected readonly formatPeriod = formatPeriod;
  protected readonly maxReasonLength = MAX_REASON_LENGTH;

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly suggestion = signal<Suggestion | null>(null);
  protected readonly loadError = signal<ApiError | null>(null);

  /** Decisão aberta para confirmar (convocar) ou escrever o motivo (pedir informação, descartar). */
  protected readonly decision = signal<Decision | null>(null);
  protected readonly reason = new FormControl('', { nonNullable: true });
  protected readonly reasonError = signal<string | null>(null);
  protected readonly sending = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly summons = signal<IssuedSummons | null>(null);
  protected readonly notice = signal<string | null>(null);

  constructor() {
    effect(() => this.load(this.id()));
  }

  protected load(id = this.id()): void {
    this.state.set('loading');
    this.suggestionApi.find(id).subscribe({
      next: (suggestion) => {
        this.suggestion.set(suggestion);
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        this.loadError.set(error);
        this.state.set('error');
      },
    });
  }

  protected open(decision: Decision): void {
    this.decision.set(decision);
    this.reason.reset();
    this.reasonError.set(null);
    this.error.set(null);
    this.focus(decision === 'summon' ? '#confirm-summon' : '#reason');
  }

  protected close(): void {
    this.decision.set(null);
    this.focus('.decisions button');
  }

  protected confirm(): void {
    const decision = this.decision();
    if (!decision || this.sending()) {
      return;
    }
    const reason = this.reason.value.trim();
    if (decision !== 'summon' && !reason) {
      this.reasonError.set(
        decision === 'info' ? 'Informe o que você precisa saber.' : 'Informe o motivo.',
      );
      this.focus('#reason');
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    const id = this.id();
    const done = <T>() => finalize<T>(() => this.sending.set(false));
    const onError = (error: ApiError) => {
      this.error.set(error);
      this.reasonError.set(error.fieldErrors['reason'] ?? null);
    };

    if (decision === 'summon') {
      this.suggestionApi
        .summon(id)
        .pipe(done())
        .subscribe({
          next: (summons) => {
            this.summons.set(summons);
            this.finish('Estudante convocado. Ele recebe um e-mail com local, horário e prazo.');
          },
          error: onError,
        });
      return;
    }
    const request =
      decision === 'info'
        ? this.suggestionApi.requestInfo(id, reason)
        : this.suggestionApi.discard(id, reason);
    request.pipe(done()).subscribe({
      next: (suggestion) => {
        this.suggestion.set(suggestion);
        this.finish(
          decision === 'info'
            ? 'Pedido enviado. O estudante recebe a pergunta por e-mail e o registro fica aguardando a resposta.'
            : 'Sugestão descartada. O motivo fica no histórico.',
        );
      },
      error: onError,
    });
  }

  private finish(message: string): void {
    this.decision.set(null);
    this.notice.set(message);
    // A situação mudou no back-end: recarrega para os botões sumirem e o selo mostrar a nova situação.
    this.suggestionApi
      .find(this.id())
      .subscribe({ next: (s) => this.suggestion.set(s), error: () => {} });
    this.focus('#notice');
  }

  protected places(suggestion: Suggestion): string {
    const locations = suggestion.lossReport.locations;
    return locations.length === 0
      ? 'Não informado'
      : locations.map(({ block, room }) => (room ? `${block}, ${room}` : block)).join('; ');
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
