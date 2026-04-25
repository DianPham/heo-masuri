import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export type Who = "heo" | "masuri";

export async function getWho(): Promise<Who | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get("who")?.value;
  if (val === "heo" || val === "masuri") return val;
  return null;
}

export function setWhoCookie(res: NextResponse, who: Who): NextResponse {
  res.cookies.set("who", who, {
    httpOnly: false, // client JS needs to read it for route awareness
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    path: "/",
  });
  return res;
}

export function clearWhoCookie(res: NextResponse): NextResponse {
  res.cookies.delete("who");
  return res;
}

export function getWhoFromRequest(req: NextRequest): Who | null {
  const val = req.cookies.get("who")?.value;
  if (val === "heo" || val === "masuri") return val;
  return null;
}
