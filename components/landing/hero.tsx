import Link from "next/link"
import { Button } from "@/components/ui/button"

const POWERUPS = ["↻ TYPE", "↻ GEN", "↻ RARITY", "★ EVOLVE"]

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* subtle pixel grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 23px,var(--color-primary) 23px,var(--color-primary) 24px),repeating-linear-gradient(90deg,transparent,transparent 23px,var(--color-primary) 23px,var(--color-primary) 24px)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1 font-display text-[9px] text-accent">
            FREE TO PLAY · NO DOWNLOAD
          </span>
          <h1 className="text-balance font-display text-3xl leading-[1.4] text-foreground sm:text-4xl sm:leading-[1.4]">
            Catch a team. Beat the Elite Four.
          </h1>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">
            Spin the roulette to catch 6 creatures, spend your one-time power-ups wisely, then watch your squad battle
            through all 12 gym leaders. Every run is different. How far can you get?
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {POWERUPS.map((p) => (
              <span key={p} className="border border-border bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground">
                {p}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button render={<Link href="/play" />} nativeButton={false} size="lg" className="font-display text-[10px]">
              START YOUR JOURNEY →
            </Button>
            <Button render={<Link href="/#how-it-works" />} nativeButton={false} size="lg" variant="outline" className="font-display text-[10px]">
              HOW IT WORKS
            </Button>
          </div>
        </div>

        {/* Mock game card */}
        <div className="flex justify-center">
          <div className="w-full max-w-sm border-[3px] border-primary bg-card p-5 shadow-[8px_8px_0_0_var(--color-primary)]">
            <div className="text-center font-display text-base tracking-widest text-primary">ELITE FOUR</div>
            <div className="mt-1 text-center font-mono text-[11px] text-muted-foreground">
              Catch 6 · Beat all 12 leaders
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { n: "Charizard", t: "Fire", c: "#a04020" },
                { n: "Gengar", t: "Ghost", c: "#3a1a5a" },
                { n: "Gyarados", t: "Water", c: "#1a4a8a" },
                { n: "Alakazam", t: "Psychic", c: "#8a1a5a" },
                { n: "Dragonite", t: "Dragon", c: "#2a1a8a" },
                { n: "Snorlax", t: "Normal", c: "#6b6b5a" },
              ].map((p) => (
                <div
                  key={p.n}
                  className="flex aspect-square flex-col items-center justify-center border-2 border-primary p-1 text-center"
                  style={{ background: p.c }}
                >
                  <span className="font-mono text-[9px] font-bold uppercase leading-tight text-[#e8d8f8]">
                    {p.n}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-2 border-accent bg-background py-3 text-center">
              <div className="font-display text-[10px] text-accent">★ CHAMPION ★</div>
              <div className="mt-1 font-display text-2xl text-foreground">
                12<span className="text-sm text-muted-foreground">/12</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
