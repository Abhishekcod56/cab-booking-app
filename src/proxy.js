
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(
  async (auth, request) => {
    const { userId } = await auth();

    const pathname = request.nextUrl.pathname;

    // Show role selection before the booking homepage.
    if (pathname === "/" && !userId) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }
  },
  {
    clockSkewInMs: 30000,
    debug: true,
  }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
