import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Página pública (RF40): divulga a sala, o horário e como funciona, sem login. Nada de foto, descrição ou local de
 * objeto aqui (RN03). Os botões levam à área do estudante; sem sessão, a guarda de rota abre o login antes.
 */
@Component({
  selector: 'app-public-home',
  imports: [RouterLink],
  templateUrl: './public-home.html',
  styleUrl: './public-home.scss',
})
export default class PublicHome {
  protected readonly registerLossUrl = '/student/losses/new';
  // "Meus registros" é a página inicial da área do estudante.
  protected readonly myLossesUrl = '/student';

  protected readonly steps = [
    {
      title: 'Registre o que perdeu',
      text: 'Diga o que é, onde e quando você acha que perdeu.',
    },
    {
      title: 'A equipe compara',
      text: 'Cada objeto que chega ao Achados e Perdidos é comparado com os registros abertos.',
    },
    {
      title: 'Você busca no balcão',
      text: 'Se combinar, você recebe o local, o prazo e o que levar para retirar.',
    },
  ];
}
