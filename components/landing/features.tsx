const FEATURES = [
  {
    title: "493 creatures",
    body: "Draw from four generations of monsters, each with real base stats that drive the battle simulation.",
  },
  {
    title: "Rarity tiers",
    body: "Five weighted tiers from Common to Legendary mean every spin carries real tension.",
  },
  {
    title: "One-time power-ups",
    body: "Type swap, generation swap, full re-roll, and a single evolution — use them at the right moment.",
  },
  {
    title: "Type-chart battles",
    body: "The 18-type effectiveness chart decides your matchups against all 12 leaders. Coverage matters.",
  },
  {
    title: "Shareable results",
    body: "Copy a clean summary of your run and challenge your friends to beat your badge count.",
  },
  {
    title: "Tracked stats",
    body: "Sign in to record every run, your best badge count, and your win rate over time.",
  },
]

export function Features() {
  return (
    <section id="features" className="border-b border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-display text-2xl leading-[1.5] text-foreground">
            Built for one-more-run
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            Quick to learn, tough to master. The randomness keeps it fresh and the stats keep you coming back.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="border border-border bg-background p-6">
              <h3 className="font-display text-[11px] leading-[1.5] text-foreground">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
