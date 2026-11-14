"use client";

const painCards = [
  {
    icon: "broken_image",
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-500",
    title: "Context Collapse After 3,000 Words",
    body: "AI chatbots lose track of your thesis, repeat themselves, and contradict earlier chapters. You spend more time fixing the output than writing from scratch.",
  },
  {
    icon: "payments",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-500",
    title: "Ghostwriters Cost $5,000–$15,000",
    body: "A professional ghostwriter takes 3–6 months and charges thousands per manuscript. Most authors can't justify the investment for their first book.",
  },
  {
    icon: "schedule",
    iconBg: "bg-indigo-500/10",
    iconText: "text-indigo-500",
    title: "Publishing Is a Separate Full-Time Job",
    body: "After writing, you still need to format for Kindle, generate a WordPress blog series, handle metadata, and schedule distribution. That workflow alone takes weeks.",
  },
];

export default function ProblemSection() {
  return (
    <section className="py-20 md:py-28 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Eyebrow */}
        <div className="flex justify-center mb-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            The Problem
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight text-center max-w-3xl mx-auto">
          Every AI Writing Tool Hits a Wall. Here&apos;s What That Costs You.
        </h2>

        {/* Subtitle */}
        <p className="mt-4 text-center text-on-surface/70 max-w-2xl mx-auto text-lg">
          You&apos;ve tried ChatGPT, Claude, and Jasper for long-form content.
          Each time, the same pattern plays out.
        </p>

        {/* Pain Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {painCards.map((card) => (
            <div
              key={card.title}
              className="p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm"
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}
              >
                <span
                  className={`material-symbols-outlined ${card.iconText} text-xl`}
                >
                  {card.icon}
                </span>
              </div>

              {/* Title */}
              <h3 className="mt-5 text-lg font-bold text-on-surface">
                {card.title}
              </h3>

              {/* Description */}
              <p className="mt-2 text-on-surface/70 leading-relaxed">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
