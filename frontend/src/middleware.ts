import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
 
export default createMiddleware(routing);
 
export const config = {
  // Match all request paths except for api, _next, _vercel, uploads, and files with extensions
  matcher: ['/', '/(th|en)/:path*', '/((?!api|_next|_vercel|uploads|.*\\.[a-zA-Z0-9]+$).*)']
};
