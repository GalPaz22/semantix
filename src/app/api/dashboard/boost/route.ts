import { NextResponse } from "next/server";

import { listBoostProducts, parseBoostFilters, parseBoostWritePayload, updateProductBoost } from "@/lib/boost/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const filters = parseBoostFilters(new URL(request.url).searchParams);
  return NextResponse.json(await listBoostProducts(filters));
}

export async function POST(request: Request) {
  try {
    const payload = parseBoostWritePayload(await request.json());
    await updateProductBoost(payload.productId, payload.boost);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "לא ניתן לעדכן את הבוסט."
      },
      { status: 400 }
    );
  }
}
