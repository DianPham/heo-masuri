import { NextResponse, type NextRequest } from "next/server";
import { getWhoFromRequest } from "@/lib/soft-gate";

export function middleware(req: NextRequest) {
  const who = getWhoFromRequest(req);
  const path = req.nextUrl.pathname;

  // If user is already identified, skip the soft gate
  if (path === "/" && who) {
    const dest = who === "heo" ? "/heo" : "/masuri";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Block Heo from accessing Masuri's routes and vice versa
  if (path.startsWith("/heo") && who !== "heo") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (path.startsWith("/masuri") && who !== "masuri") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Magic-link routes (/m/*) require masuri cookie for reply routes
  if (path.match(/^\/m\/angry\/[^/]+\/reply\//)) {
    if (who !== "masuri") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Notebook approval route — Masuri only
  if (path.match(/^\/m\/notebook\/approve\//)) {
    if (who !== "masuri") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/heo/:path*", "/masuri/:path*", "/m/:path*"],
};
