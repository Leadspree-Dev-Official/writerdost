/**
 * Feature upgrade requests.
 *
 * A user raises one from the locked-feature screen; an administrator reviews
 * it. Those are two different people, which is precisely why this cannot live
 * in localStorage the way it used to — the admin would never see it.
 *
 * Reading splits by role: a user reads their own rows through the JWT client
 * and Appwrite's row permissions enforce that; an admin reads every row
 * through the worker key, which is the only way to see rows they do not own.
 */
import { NextResponse } from "next/server";
import { DATABASE_ID, ID, Query, TABLES, ownerPermissions, workerTables } from "@/lib/appwrite/server";
import { adminUsers, requireUser } from "@/lib/appwrite/session";
import { isAdminAccount } from "@/lib/auth/profile";
import type { UpgradeRequest } from "@/lib/store-types";

export const dynamic = "force-dynamic";

type RequestRow = {
  $id: string;
  $createdAt: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  feature: string;
  status: UpgradeRequest["status"];
};

function toRequest(row: RequestRow): UpgradeRequest {
  return {
    id: row.$id,
    userId: row.userId,
    userEmail: row.userEmail,
    userName: row.userName ?? "",
    feature: row.feature,
    timestamp: row.$createdAt,
    status: row.status,
  };
}

/**
 * True when the account carries the admin label. Read through the Users API
 * because labels are server-assigned; see requireAdmin for why this is a label
 * and not an account preference.
 */
async function isAdmin(userId: string): Promise<boolean> {
  try {
    return isAdminAccount(await adminUsers().get({ userId }));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  try {
    const admin = await isAdmin(session.user.id);

    const page = admin
      ? await workerTables().listRows({
          databaseId: DATABASE_ID,
          tableId: TABLES.upgrades,
          queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
        })
      : await session.tables.listRows({
          databaseId: DATABASE_ID,
          tableId: TABLES.upgrades,
          queries: [
            Query.equal("userId", session.user.id),
            Query.orderDesc("$createdAt"),
            Query.limit(100),
          ],
        });

    return NextResponse.json({ requests: (page.rows as unknown as RequestRow[]).map(toRequest) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The request failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  try {
    const { feature } = (await request.json()) as { feature?: string };
    if (!feature) {
      return NextResponse.json({ error: "A feature is required." }, { status: 400 });
    }

    // Asking twice is not an error, and should not create a second row for the
    // admin to work through.
    const existing = await session.tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.upgrades,
      queries: [
        Query.equal("userId", session.user.id),
        Query.equal("feature", feature),
        Query.equal("status", "pending"),
        Query.limit(1),
      ],
    });

    const already = (existing.rows as unknown as RequestRow[])[0];
    if (already) return NextResponse.json({ request: toRequest(already) });

    const row = (await session.tables.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.upgrades,
      rowId: ID.unique(),
      data: {
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.fullName,
        feature,
        status: "pending",
      },
      permissions: ownerPermissions(session.user.id),
    })) as unknown as RequestRow;

    return NextResponse.json({ request: toRequest(row) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The request failed." },
      { status: 500 },
    );
  }
}

/** Marking a request handled. Administrators only — it is not their row. */
export async function PATCH(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  }

  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "An id is required." }, { status: 400 });

    await workerTables().updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.upgrades,
      rowId: id,
      data: { status: "resolved" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The request failed." },
      { status: 500 },
    );
  }
}
