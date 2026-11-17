import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Página inicial provisória; o conteúdo da página pública é o card PUB-01. */
@Component({
  selector: 'app-public-home',
  imports: [RouterLink],
  template: `
    <h1>Perdeu alguma coisa na UCSal?</h1>
    <p>O Cadê? ajuda a sala de achados e perdidos a devolver o que é seu.</p>
    <a class="button" routerLink="/login">Entrar com o e-mail da UCSal</a>
  `,
})
export default class PublicHome {}
