import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });

  response.cookies.set({
    name: "admin_session",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
