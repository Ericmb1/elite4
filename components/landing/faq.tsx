import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const FAQS = [
  {
    q: "Is it free to play?",
    a: "Yes. Elite Four is completely free to play in your browser with no download required. The game is supported by ads.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can jump straight into a run without signing up. Creating a free account only adds run history and stat tracking.",
  },
  {
    q: "How long is a run?",
    a: "About two minutes. You spin and catch six creatures, then the gauntlet of 12 battles is simulated instantly.",
  },
  {
    q: "How are battles decided?",
    a: "Each leader has a power threshold and a type. Your team's combined base stats are multiplied by your best type matchup against that leader. Clear the threshold and you advance.",
  },
  {
    q: "Is this an official Pokémon game?",
    a: "No. This is a fan-made parody project and is not affiliated with, endorsed by, or sponsored by Nintendo, Game Freak, or The Pokémon Company.",
  },
]

export function Faq() {
  return (
    <section id="faq" className="border-b border-border">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
        <div className="text-center">
          <h2 className="text-balance font-display text-2xl leading-[1.5] text-foreground">Questions</h2>
        </div>
        <Accordion className="mt-10 w-full">
          {FAQS.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 flex flex-col items-center gap-4 border-[3px] border-primary bg-card p-8 text-center shadow-[8px_8px_0_0_var(--color-primary)]">
          <h3 className="font-display text-base leading-[1.5] text-foreground">Ready to roll?</h3>
          <p className="text-sm text-muted-foreground">Your team is waiting. See if you can become Champion.</p>
          <Button render={<Link href="/play" />} nativeButton={false} size="lg" className="font-display text-[10px]">
            PLAY FREE →
          </Button>
        </div>
      </div>
    </section>
  )
}
