import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { PlayClient } from "@/components/play/play-client"

export const metadata: Metadata = {
  title: "Play Elite Four — Free Pokémon Catching Gauntlet",
  description:
    "Spin, catch a team of 6, and battle through all 12 gym leaders. Play free in your browser, no download required.",
}

export default function PlayPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <PlayClient />
    </div>
  )
}
