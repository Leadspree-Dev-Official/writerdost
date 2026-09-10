import { NextRequest, NextResponse } from "next/server";
import { guardRequest, readJsonBody } from "@/lib/api-guard";
import { checkCredentials, listingIdFor, simulateLatency, type Credentials } from "@/lib/marketplace-mock";

type PublishBody = Credentials & {
  project?: {
    id?: unknown;
    title?: unknown;
    description?: unknown;
    wordCount?: unknown;
    chapterCount?: unknown;
  };
  listing?: {
    price?: unknown;
    currency?: unknown;
    category?: unknown;
    visibility?: unknown;
  };
  revision?: unknown;
};

/** The floor the real storefront enforces on a paid listing. */
const MIN_WORDS = 200;

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req, { limit: 10 });
  if (blocked) return blocked;

  try {
    const body = await readJsonBody<PublishBody>(req, 200_000);
    const checked = checkCredentials(body);
    if ("error" in checked) return checked.error;

    const projectId = typeof body.project?.id === "string" ? body.project.id : "";
    const title = typeof body.project?.title === "string" ? body.project.title.trim() : "";
    const wordCount = Number(body.project?.wordCount ?? 0);
    const price = Number(body.listing?.price ?? 0);
    const visibility = body.listing?.visibility === "public" ? "public" : "draft";

    if (!projectId || !title) {
      return NextResponse.json({ error: "A listing needs a project id and a title." }, { status: 422 });
    }
    if (!Number.isFinite(wordCount) || wordCount < MIN_WORDS) {
      return NextResponse.json(
        { error: `Listings need at least ${MIN_WORDS} words. This manuscript has ${wordCount}.` },
        { status: 422 },
      );
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price must be zero or more." }, { status: 422 });
    }
    if (!body.listing?.category) {
      return NextResponse.json({ error: "Pick a category for the listing." }, { status: 422 });
    }

    await simulateLatency();

    const listingId = listingIdFor(checked.ok.sellerId, projectId);
    const revision = Number.isFinite(Number(body.revision)) ? Number(body.revision) + 1 : 1;

    return NextResponse.json({
      listingId,
      listingUrl: `https://instaguru.market/l/${listingId}`,
      revision,
      publishedAt: new Date().toISOString(),
      visibility,
      mock: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publishing failed." },
      { status: 400 },
    );
  }
}
