import { Routes } from '@angular/router';

/**
 * Uma área por perfil (seção 2 dos requisitos), cada uma carregada só quando é aberta. A guarda por perfil entra
 * com o login (ACE-04).
 */
export const routes: Routes = [
  { path: '', loadChildren: () => import('./features/public/public.routes') },
  { path: 'student', loadChildren: () => import('./features/student/student.routes') },
  { path: 'staff', loadChildren: () => import('./features/staff/staff.routes') },
  { path: 'admin', loadChildren: () => import('./features/admin/admin.routes') },
  {
    path: '**',
    title: 'Página não encontrada · Cadê?',
    loadComponent: () => import('./features/not-found/not-found'),
  },
];
