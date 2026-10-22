"use client";

import DOMPurify from "dompurify";
import { useEffect, useState, type CSSProperties } from "react";

export default function SafeHtml({
  html,
  className,
  style,
}: {
  html: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [safe, setSafe] = useState("");

  useEffect(() => {
    setSafe(
      DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target"],
      }),
    );
  }, [html]);

  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: safe }} />;
}
