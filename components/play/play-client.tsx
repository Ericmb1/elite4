"use client"

import EliteFourGame from "@/components/game/elite-four-game"
import { AdSlot } from "@/components/play/ad-slot"

export function PlayClient() {
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-8 sm:px-6">
        {/* Top leaderboard ad */}
        <AdSlot
          label="Advertisement"
          slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP}
          className="h-[90px] w-full max-w-[728px]"
        />

        <div className="flex w-full flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
          {/* Game */}
          <div className="w-full max-w-[460px]">
            <EliteFourGame />
          </div>

          {/* Side ad (desktop) */}
          <AdSlot
            label="Advertisement"
            slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDE}
            className="hidden h-[600px] w-[300px] shrink-0 lg:block"
          />
        </div>

        {/* Bottom ad */}
        <AdSlot
          label="Advertisement"
          slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM}
          className="h-[90px] w-full max-w-[728px]"
        />
      </div>
    </main>
  )
}
