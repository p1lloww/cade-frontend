import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Administração · Cadê?', loadComponent: () => import('./admin-home') },
  {
    path: 'team',
    title: 'Equipe da sala · Cadê?',
    loadComponent: () => import('./team/team-page'),
  },
  {
    path: 'categories',
    title: 'Categorias · Cadê?',
    loadComponent: () => import('./categories/categories-page'),
  },
  {
    path: 'deadlines',
    title: 'Prazos · Cadê?',
    loadComponent: () => import('./deadlines/deadlines-page'),
  },
] satisfies Routes;
