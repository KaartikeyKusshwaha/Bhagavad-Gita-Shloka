export function protectedReaderPage(path: string) {
  return (
    path === '/' ||
    ['/library', '/read', '/study', '/search', '/verify', '/lesson', '/offline'].some(
      (prefix) => path === prefix || path.startsWith(prefix + '/'),
    )
  );
}
export function protectedReaderApi(path: string) {
  return (
    path.startsWith('/v1/') &&
    !['/v1/account', '/v1/health', '/v1/sources', '/v1/admin', '/v1/openapi'].some(
      (prefix) => path === prefix || path.startsWith(prefix + '/'),
    )
  );
}
