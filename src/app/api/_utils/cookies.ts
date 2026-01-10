import { NextResponse } from "next/server";
import { ENV } from "./env";

export function setAuthCookies(res: NextResponse, accessToken: string, refreshToken: string) {
  const secure = process.env.NODE_ENV === "production";

  res.cookies.set(ENV.ACCESS_COOKIE_NAME(), accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1h
  });

  res.cookies.set(ENV.REFRESH_COOKIE_NAME(), refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30j
  });
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ENV.ACCESS_COOKIE_NAME(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set(ENV.REFRESH_COOKIE_NAME(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
