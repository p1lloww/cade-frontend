import { environment } from '../../../environments/environment';

/** Monta o endereço de uma rota da API, por exemplo `apiUrl('/auth/token')`. */
export function apiUrl(path: string): string {
  return environment.apiUrl + (path.startsWith('/') ? path : `/${path}`);
}

/** Diz se a requisição vai para a API, e não para outro endereço (só elas levam o token e o header do ngrok). */
export function isApiUrl(url: string): boolean {
  return url === environment.apiUrl || url.startsWith(`${environment.apiUrl}/`);
}
