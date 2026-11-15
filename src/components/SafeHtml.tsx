"use client";

import DOMPurify from "dompurify";
import { useMemo, type CSSProperties } from "react";

export default function SafeHtml({
  html,
  className,
  style,
}: {
  html: string;
  className?: string;
  style?: CSSProperties;
}) {
  const safe = useMemo(() => {
    if (typeof window === "undefined") return "";
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target"],
    });
  }, [html]);

  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: safe }} />;
}
