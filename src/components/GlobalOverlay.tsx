"use client";

import { useAppStore } from "@/lib/app-store";
import { GenerationOverlay } from "@/components/ui/GenerationOverlay";

export default function GlobalOverlay() {
  const cancelGeneration = useAppStore((state) => state.cancelGeneration);
  
  return <GenerationOverlay onCancel={cancelGeneration} />;
}
