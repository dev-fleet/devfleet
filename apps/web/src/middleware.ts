import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const APP_HOSTNAME = new Set([`app.devfleet.com`, "localhost:3001"]);

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|_vercel|images/|_proxy/|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const path = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams.toString();
  const searchParamsObj = Object.fromEntries(request.nextUrl.searchParams);
  const searchParamsString = searchParams.length > 0 ? `?${searchParams}` : "";
  const fullPath = `${path}${searchParamsString}`;

  if (!sessionCookie && path !== "/login") {
    return NextResponse.redirect(
      new URL(
        `/login${path === "/" ? "" : `?next=${encodeURIComponent(fullPath)}`}`,
        request.url
      )
    );
  } else if (sessionCookie) {
    if (searchParamsObj.next) {
      return NextResponse.redirect(new URL(searchParamsObj.next, request.url));
    } else if (path === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}
