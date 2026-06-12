import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center border-2 border-accent bg-primary text-primary-foreground font-display text-[9px]">
            E4
          </span>
          <span className="text-sm text-muted-foreground">Elite Four</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/play" className="transition-colors hover:text-foreground">
            Play
          </Link>
          <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-foreground">
            FAQ
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          A fan-made parody game. Not affiliated with Nintendo or The Pokémon Company.
        </p>
      </div>
    </footer>
  )
}
