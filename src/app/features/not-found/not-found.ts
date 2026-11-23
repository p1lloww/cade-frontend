import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  host: { class: 'page' },
  imports: [RouterLink],
  template: `
    <h1>Página não encontrada</h1>
    <p>O endereço pode ter mudado ou estar incompleto.</p>
    <a class="button" routerLink="/">Voltar ao início</a>
  `,
})
export default class NotFound {}
