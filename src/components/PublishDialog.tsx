"use client";

import { BundleKartPublishModal } from "@/components/BundleKartPublishModal";

/**
 * Publishes one project to BundleKart Marketplace.
 * Opened from the editor and from the projects list.
 */
export function PublishDialog({
  projectId,
  onClose,
  onDone,
}: {
  projectId: string;
  onClose: () => void;
  onDone?: (message: string) => void;
}) {
  return (
    <BundleKartPublishModal
      projectId={projectId}
      onClose={onClose}
      onDone={onDone}
    />
  );
}
