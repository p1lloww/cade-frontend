import { homeFor, isProtectedUrl } from './role';

describe('role', () => {
  it('leva cada perfil à sua área', () => {
    expect(homeFor('STUDENT')).toBe('/student');
    expect(homeFor('STAFF')).toBe('/staff');
    expect(homeFor('ADMIN')).toBe('/admin');
  });

  it.each([
    ['/student', true],
    ['/staff/items?page=2', true],
    ['/admin#topo', true],
    ['/', false],
    ['/login', false],
    ['/students', false],
  ])('diz se %s exige login', (url, expected) => {
    expect(isProtectedUrl(url)).toBe(expected);
  });
});
