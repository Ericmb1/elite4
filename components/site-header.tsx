import Link from "next/link"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center border-2 border-accent bg-primary text-primary-foreground font-display text-[10px]">
            E4
          </span>
          <span className="font-display text-xs tracking-tight text-foreground">ELITE FOUR</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="/#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            FAQ
          </Link>
        </nav>
        <Button render={<Link href="/play" />} nativeButton={false} className="font-display text-[10px]">
          PLAY FREE
        </Button>
      </div>
    </header>
  )
}
