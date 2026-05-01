const CSRF_COOKIE_NAME = 'csrf_token';

/**
 * Reads CSRF token from browser cookie storage.
 * CSRF cookie is intentionally non-httpOnly so JS can mirror it to a header.
 */
export const getCsrfToken = () => {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const csrfEntry = cookies.find((entry) => entry.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (!csrfEntry) return null;

  return decodeURIComponent(csrfEntry.split('=').slice(1).join('='));
};
