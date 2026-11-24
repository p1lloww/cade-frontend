import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Área da sala · Cadê?', loadComponent: () => import('./staff-home') },
  {
    path: 'items/new',
    title: 'Cadastrar objeto · Cadê?',
    loadComponent: () => import('./found-items/new-found-item/new-found-item-page'),
  },
  {
    path: 'items/:id/suggestions',
    title: 'Sugestões do objeto · Cadê?',
    loadComponent: () => import('./suggestions/item-suggestions/item-suggestions-page'),
  },
  {
    path: 'suggestions/:id',
    title: 'Comparar · Cadê?',
    loadComponent: () => import('./suggestions/compare/suggestion-compare-page'),
  },
] satisfies Routes;
