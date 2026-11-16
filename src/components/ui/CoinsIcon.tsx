import React from "react";

interface CoinsIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Double-coin icon representing platform credits.
 * Displays two overlapping embossed coins without any currency or dollar signs.
 */
export function CoinsIcon({ className = "w-4 h-4 text-amber-500", ...props }: CoinsIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Back Coin */}
      <circle cx="8" cy="8.5" r="5.5" opacity="0.85" />
      <path d="M5.8 8.5h4.4" strokeWidth="1.2" opacity="0.6" />

      {/* Front Coin */}
      <circle cx="15" cy="14.5" r="6" className="fill-surface dark:fill-[#0c0c14]" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="15" cy="14.5" r="3.2" strokeWidth="1.2" opacity="0.75" />
    </svg>
  );
}

export default CoinsIcon;
