"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

const ADSENSE_CLIENT = "ca-pub-5796004440424134"

/**
 * Renders a Google AdSense unit when configured, otherwise a styled placeholder.
 *
 * Setup:
 *  1. Get approved at https://www.google.com/adsense and create ad units.
 *  2. Set NEXT_PUBLIC_ADSENSE_CLIENT (e.g. "ca-pub-XXXXXXXXXXXXXXXX").
 *  3. Pass the per-unit slot id via the `slot` prop (e.g. "1234567890").
 *
 * The fixed width/height (via className) match standard IAB units so the
 * layout never shifts when ads load.
 */
export function AdSlot({
  label = "Advertisement",
  slot,
  className,
}: {
  label?: string
  slot?: string
  className?: string
}) {
  const insRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)
  const enabled = Boolean(ADSENSE_CLIENT && slot)

  useEffect(() => {
    if (!enabled || pushed.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch (err) {
      console.log("[v0] adsbygoogle push failed:", err)
    }
  }, [enabled])

  if (!enabled) {
    return (
      <div
        className={cn(
          "grid place-items-center border border-dashed border-border bg-card/40 text-center",
          className,
        )}
        aria-hidden="true"
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
    )
  }

  return (
    <div className={cn("overflow-hidden", className)} aria-label={label} role="complementary">
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "100%" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
      />
    </div>
  )
}
