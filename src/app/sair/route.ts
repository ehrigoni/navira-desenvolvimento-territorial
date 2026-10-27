import { NextResponse } from "next/server";
import { encerrarSessao } from "@/lib/session";

export async function POST(request: Request) {
  await encerrarSessao();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
