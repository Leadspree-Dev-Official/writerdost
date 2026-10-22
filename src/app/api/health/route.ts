import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "writerdost",
    version: process.env.BUILD_VERSION || "dev",
    time: new Date().toISOString(),
  });
}
