import { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Área da sala · Cadê?',
    loadComponent: () => import('./found-items/search/found-item-search-page'),
  },
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
  {
    path: 'items/:id/walk-in',
    title: 'Entregar sem registro · Cadê?',
    loadComponent: () => import('./counter/walk-in/walk-in-page'),
  },
  {
    path: 'counter',
    title: 'Balcão · Cadê?',
    loadComponent: () => import('./counter/counter-list/counter-list-page'),
  },
  {
    path: 'counter/:id',
    title: 'Atender · Cadê?',
    loadComponent: () => import('./counter/counter-summons/counter-summons-page'),
  },
] satisfies Routes;
