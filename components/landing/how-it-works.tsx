const STEPS = [
  {
    num: "01",
    title: "Spin the roulette",
    body: "Each catch starts with a roulette spin that lands on a random creature, weighted by rarity tier from Common to Legendary.",
  },
  {
    num: "02",
    title: "Catch or re-roll",
    body: "Keep what you spun, or burn one of your one-time power-ups to swap its type, generation, or roll a whole new rarity.",
  },
  {
    num: "03",
    title: "Build your six",
    body: "Evolve a creature once per run for a stat boost, and balance your type coverage across the whole team.",
  },
  {
    num: "04",
    title: "Battle the gauntlet",
    body: "Your team auto-battles all 8 gym leaders, the Elite Four, and the Champion. Type matchups and total stats decide how far you go.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-display text-2xl leading-[1.5] text-foreground">How it works</h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            A full run takes about two minutes. No accounts required to play — sign in only if you want to track your
            stats.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.num} className="flex flex-col gap-3 border border-border bg-card p-6">
              <span className="font-display text-sm text-accent">{step.num}</span>
              <h3 className="font-display text-[11px] leading-[1.5] text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
