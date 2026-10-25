import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkLoginRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Enforce Strict Route Guarding and No-Cache on /admin routes
  if (pathname.startsWith("/admin")) {
    const sessionCookie =
      request.cookies.get("better-auth.session_token")?.value ||
      request.cookies.get("__Secure-better-auth.session_token")?.value;

    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      redirectResponse.headers.set("Pragma", "no-cache");
      redirectResponse.headers.set("Expires", "0");
      return redirectResponse;
    }

    const response = NextResponse.next();
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }

  // 2. Protect sensitive auth login endpoints against brute-force (10 attempts / 15 mins)
  if (
    pathname.startsWith("/api/auth/sign-in") ||
    pathname.startsWith("/api/auth/callback/credentials") ||
    pathname.startsWith("/api/auth/login")
  ) {
    if (request.method === "POST") {
      const clientIp = getClientIpFromHeaders(request.headers);
      const rateCheck = checkLoginRateLimit(clientIp);

      if (!rateCheck.success) {
        return new NextResponse(
          JSON.stringify({
            error: `Too many login attempts. Please wait ${Math.ceil(
              rateCheck.resetInSeconds / 60
            )} minutes before trying again.`,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": rateCheck.resetInSeconds.toString(),
            },
          }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin", "/api/auth/:path*"],
};
