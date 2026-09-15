/**
 * The shapes that travel between the browser and /api/workspace.
 *
 * A workspace is split in two on purpose: `settings` is the small bag that
 * changes on nearly every interaction, and `projects` are the manuscripts,
 * each saved on its own so one edited chapter does not rewrite the shelf.
 *
 * Both sides treat the payloads as opaque JSON. Typing them here would mean
 * maintaining a second copy of the store's types, and the store is the only
 * thing that reads them back.
 */
/**
 * A manuscript as it is stored: the store's `Project`, structurally typed so
 * this module (and the server that imports it) never pulls in the client
 * store.
 */
export type StoredProject = { id: string; title?: string } & Record<string, unknown>;

/** Everything in a workspace except the manuscripts. */
export type WorkspaceSettings = Record<string, unknown>;

export type WorkspaceSnapshot = {
  settings: WorkspaceSettings | null;
  projects: StoredProject[];
  /** False when Appwrite answered but has never held a row for this account. */
  existed: boolean;
  /**
   * Set when the server could not encrypt the secrets in `settings`, so they
   * were dropped rather than written in the clear.
   */
  secretsDropped?: boolean;
};

/** A save. Any part may be omitted; what is absent is left untouched. */
export type WorkspacePatch = {
  settings?: WorkspaceSettings;
  projects?: StoredProject[];
  deletedProjectIds?: string[];
};
