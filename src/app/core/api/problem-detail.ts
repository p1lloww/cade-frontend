/**
 * Corpo de erro devolvido pelo back-end (RFC 9457, application/problem+json). O `detail` é a mensagem para o
 * usuário, já em português; nos erros de validação, `errors` liga cada campo à sua mensagem.
 */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string>;
}
