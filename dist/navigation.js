// Permit only application entry points; never redirect a login to another origin.
export function safeReturnPath(value, origin) {
  if (!value) return 'index.html';
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || !['/index.html', '/workspace.html', '/view.html', '/create.html'].includes(url.pathname)) return 'index.html';
    return url.pathname + url.search + url.hash;
  } catch { return 'index.html'; }
}
export function loginURL(location) {
  return 'login.html?next=' + encodeURIComponent(location.pathname + location.search + location.hash);
}
