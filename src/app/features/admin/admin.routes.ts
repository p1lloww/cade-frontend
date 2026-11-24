import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Administração · Cadê?', loadComponent: () => import('./admin-home') },
  {
    path: 'team',
    title: 'Equipe da sala · Cadê?',
    loadComponent: () => import('./team/team-page'),
  },
] satisfies Routes;
