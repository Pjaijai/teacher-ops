import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

/**
 * Next 16 "proxy" (formerly middleware): locale routing only.
 * Sign-in is enforced by the API (401) and the app shell, not here.
 */
export default createMiddleware(routing);

export const config = {
  // Everything except the API, Next internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
