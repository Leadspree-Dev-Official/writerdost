/**
 * The shapes crossing the browser/server boundary for automations.
 *
 * One rule governs the whole file: **a secret travels inwards only**. The
 * browser may send a credential to be stored, and is told afterwards only
 * whether one is on file. Nothing here ever carries a token, an application
 * password or an AI key back out — which is why the read and write shapes are
 * separate types rather than one shape used in both directions.
 */
import type {
  ApiSettings,
  AutomationDestinationKind,
  AutomationFrequency,
  AutomationPublishMode,
  AutomationSourceKind,
  BlogAutomation,
  CampaignPost,
} from "@/lib/store-types";

/* ---------------------------------------------------------------- */
/* Destinations                                                      */
/* ---------------------------------------------------------------- */

/** A destination as the browser may see it: config minus the credential. */
export type DestinationWire = {
  id: string;
  name: string;
  kind: AutomationDestinationKind;
  /** Never contains `secret`. */
  config: Record<string, string>;
  /** Whether a credential is stored, so the form can say "leave blank to keep". */
  secretSet: boolean;
};

export type DestinationInput = {
  name: string;
  kind: AutomationDestinationKind;
  /** `secret`, when present, is encrypted server-side and stripped from config. */
  config: Record<string, string>;
};

/* ---------------------------------------------------------------- */
/* Automations                                                       */
/* ---------------------------------------------------------------- */

/** An automation as the browser may see it. */
export type AutomationWire = BlogAutomation & {
  /** Whether the scheduler has an AI key of its own for this job. */
  aiConfigured: boolean;
  /** Provider and model are not secret, and the UI shows them. */
  aiProvider: string;
  aiModel: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
};

export type AutomationInput = {
  name?: string;
  enabled?: boolean;
  sourceKind?: AutomationSourceKind;
  sourceConfig?: BlogAutomation["sourceConfig"];
  contentConfig?: BlogAutomation["contentConfig"];
  destinationId?: string | null;
  publish?: AutomationPublishMode;
  frequency?: AutomationFrequency;
  startDate?: string;
  startTime?: string;
  scheduleCron?: string;
  timezone?: string;
  /**
   * The AI settings the scheduler should spend when it runs this job at 3am
   * with no browser attached. The key is encrypted before it is stored and is
   * never returned; omit the field to leave the stored one untouched.
   */
  api?: Partial<ApiSettings>;
};

/* ---------------------------------------------------------------- */
/* Posts                                                             */
/* ---------------------------------------------------------------- */

export type PostWire = CampaignPost;

export type PostInput = Omit<CampaignPost, "id" | "createdAt"> & { id?: string };
