import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/appwrite/session";
import {
  getAllCoupons,
  addCoupon,
  updateCoupon,
  deleteCoupon,
} from "@/lib/server-subscription-store";
import type { Coupon } from "@/lib/store-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // If user is authenticated admin, return all coupons including inactive.
  // Otherwise return active ones.
  const { session } = await requireUser(request);
  const isAdmin = session?.user.role === "admin";

  const all = getAllCoupons();
  if (isAdmin) {
    return NextResponse.json({ coupons: all });
  }

  const active = all.filter((c) => c.isActive);
  return NextResponse.json({ coupons: active });
}

export async function POST(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Partial<Coupon>;
    if (!body.code || !body.discountType || body.discountValue == null) {
      return NextResponse.json(
        { error: "Code, discount type, and discount value are required." },
        { status: 400 }
      );
    }

    const code = body.code.trim().toUpperCase();
    const existing = getAllCoupons().find((c) => c.code.toUpperCase() === code);
    if (existing) {
      return NextResponse.json(
        { error: `Coupon with code "${code}" already exists.` },
        { status: 409 }
      );
    }

    const newCoupon: Coupon = {
      id: `coupon_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      code,
      discountType: body.discountType,
      discountValue: Number(body.discountValue),
      validUntil: body.validUntil || null,
      maxUses: body.maxUses ? Number(body.maxUses) : null,
      timesUsed: 0,
      isActive: body.isActive !== false,
      minPlan: body.minPlan,
      createdAt: new Date().toISOString(),
    };

    const saved = addCoupon(newCoupon);
    return NextResponse.json({ success: true, coupon: saved });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create coupon." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as { id: string } & Partial<Coupon>;
    if (!body.id) {
      return NextResponse.json({ error: "Coupon ID is required." }, { status: 400 });
    }

    const updated = updateCoupon(body.id, body);
    if (!updated) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update coupon." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Coupon ID parameter is required." }, { status: 400 });
    }

    const ok = deleteCoupon(id);
    if (!ok) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete coupon." },
      { status: 500 }
    );
  }
}
