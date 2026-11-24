import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Área da sala · Cadê?', loadComponent: () => import('./staff-home') },
  {
    path: 'items/new',
    title: 'Cadastrar objeto · Cadê?',
    loadComponent: () => import('./found-items/new-found-item/new-found-item-page'),
  },
] satisfies Routes;
