/**
 * Dry run for one automation configuration.
 *
 * Takes the whole config in the request body rather than an id, so it works
 * before Appwrite is wired up and lets someone see exactly what an automation
 * would produce without scheduling it or storing anything.
 *
 * Nothing is persisted here. Publishing only happens when `publishNow` is
 * explicitly set, which the UI reserves for a deliberate "send a test post"
 * action.
 */
import { NextResponse } from "next/server";
import { guardRequest, readJsonBody } from "@/lib/api-guard";
import { BlockedRequestError } from "@/lib/net-guard";
import { collectSourceItems } from "@/lib/automation/sources";
import { assessQuality, writePost } from "@/lib/automation/pipeline";
import { publishPost } from "@/lib/automation/destinations";
import type { Automation, Destination } from "@/lib/automation/types";

export const maxDuration = 300;

type PreviewPayload = {
  automation: Omit<Automation, "id" | "userId" | "destination"> & {
    destination?: Destination | null;
  };
  /** When true the generated post is actually sent to the destination. */
  publishNow?: boolean;
};

export async function POST(request: Request) {
  // Tighter than the AI route: each call can trigger several model requests.
  const blocked = guardRequest(request, { limit: 4 });
  if (blocked) return blocked;

  try {
    const { automation, publishNow } = await readJsonBody<PreviewPayload>(request);

    if (!automation?.api?.model) {
      return NextResponse.json(
        { error: "Configure an AI provider and model before running a preview." },
        { status: 400 },
      );
    }

    const config = {
      ...automation,
      id: "preview",
      userId: "preview",
      destination: automation.destination ?? null,
      // A preview never writes a batch — one post is enough to judge it.
      sourceConfig: { ...automation.sourceConfig, maxPerRun: 1 },
    } as Automation;

    const items = await collectSourceItems({
      sourceKind: config.sourceKind,
      sourceConfig: config.sourceConfig,
      // A dry run deliberately ignores dedupe so it always has something to do.
      seenHashes: new Set(),
    });

    if (items.length === 0) {
      return NextResponse.json(
        {
          error:
            config.sourceKind === "topic"
              ? "Add at least one topic to write about."
              : "No usable articles were found at that URL. Check the feed address.",
        },
        { status: 422 },
      );
    }

    const { post, tokens } = await writePost(config, items[0]);
    const quality = assessQuality(post, config.contentConfig.targetWords || 1000);

    let published: { state: string; remoteUrl?: string; error?: string } | null = null;

    if (publishNow && config.destination) {
      try {
        // A test send is always a draft, whatever the automation's mode is.
        const result = await publishPost(post, config.destination, "draft");
        published = { state: result.state, remoteUrl: result.remoteUrl };
      } catch (error) {
        published = {
          state: "failed",
          error: error instanceof Error ? error.message : "Publishing failed.",
        };
      }
    }

    return NextResponse.json({
      post,
      quality,
      tokens,
      published,
      source: {
        url: items[0].url.startsWith("topic:") ? null : items[0].url,
        title: items[0].title,
        words: items[0].content.split(/\s+/).filter(Boolean).length,
      },
    });
  } catch (error) {
    if (error instanceof BlockedRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The preview failed." },
      { status: 500 },
    );
  }
}
