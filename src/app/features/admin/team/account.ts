import { Role } from '../../../core/auth/role';

/** Conta de um usuário, como o administrador a vê (GET /users). */
export interface Account {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  STUDENT: 'Estudante',
  STAFF: 'Funcionário',
  ADMIN: 'Administrador',
};
