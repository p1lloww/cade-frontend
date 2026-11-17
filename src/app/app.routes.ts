import { Routes } from '@angular/router';
import { guestGuard, roleGuard } from './core/auth/auth-guards';

const staffOrAdmin = roleGuard('STAFF', 'ADMIN');
const student = roleGuard('STUDENT');
const admin = roleGuard('ADMIN');

/**
 * Uma área por perfil (seção 2 dos requisitos), cada uma carregada só quando é aberta e liberada só para o seu
 * perfil. O administrador faz tudo o que o funcionário faz, então também entra na área da sala.
 */
export const routes: Routes = [
  { path: '', loadChildren: () => import('./features/public/public.routes') },
  {
    path: 'login',
    title: 'Entrar · Cadê?',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login-page'),
  },
  {
    path: 'student',
    canActivate: [student],
    canActivateChild: [student],
    loadChildren: () => import('./features/student/student.routes'),
  },
  {
    path: 'staff',
    canActivate: [staffOrAdmin],
    canActivateChild: [staffOrAdmin],
    loadChildren: () => import('./features/staff/staff.routes'),
  },
  {
    path: 'admin',
    canActivate: [admin],
    canActivateChild: [admin],
    loadChildren: () => import('./features/admin/admin.routes'),
  },
  {
    path: '**',
    title: 'Página não encontrada · Cadê?',
    loadComponent: () => import('./features/not-found/not-found'),
  },
];
