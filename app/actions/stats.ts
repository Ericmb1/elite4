'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { gameStats, EMPTY_STATS, type StatsData } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  return session.user
}

function normalize(raw: any): StatsData {
  // Recover from any legacy nested `.stats` wrapper and keep only known keys,
  // so junk fields never re-propagate into saved rows.
  const seenUnion = new Set<number>()
  const achUnion = new Set<string>()
  const dexUnion: any[] = []
  const dexKeys = new Set<string | number>()
  const nums: Record<string, number> = {
    bestRun: 0, totalWins: 0, legendariesCaught: 0, shiniesCaught: 0,
    totalRuns: 0, bestRunNoReroll: 0, shinyChampion: 0, metMissingNo: 0,
  }
  let node: any = raw
  let depth = 0
  while (node && typeof node === 'object' && depth < 10) {
    if (Array.isArray(node.seen)) node.seen.forEach((d: number) => seenUnion.add(d))
    if (Array.isArray(node.achievements)) node.achievements.forEach((a: string) => achUnion.add(a))
    if (Array.isArray(node.pokedex)) node.pokedex.forEach((p: any) => {
      const k = p && (p.keptAt ?? `${p.dex}-${p.name}`)
      if (k != null && !dexKeys.has(k)) { dexKeys.add(k); dexUnion.push(p) }
    })
    for (const key of Object.keys(nums)) {
      if (typeof node[key] === 'number') nums[key] = Math.max(nums[key], node[key])
    }
    node = node.stats
    depth++
  }
  return {
    ...(nums as Omit<StatsData, 'achievements' | 'pokedex' | 'seen'>),
    achievements: Array.from(achUnion),
    pokedex: dexUnion,
    seen: Array.from(seenUnion).sort((a, b) => a - b),
  }
}

/**
 * Returns the signed-in user's stats and username. Creates the row on first
 * call. Returns null when there is no session (guest play).
 */
export async function getStats(): Promise<{ username: string; stats: StatsData } | null> {
  const user = await getSessionUser()
  if (!user) return null

  const rows = await db.select().from(gameStats).where(eq(gameStats.userId, user.id)).limit(1)

  if (rows.length === 0) {
    const username = user.name || user.email.split('@')[0]
    await db.insert(gameStats).values({
      userId: user.id,
      username,
      data: EMPTY_STATS,
      bestRun: 0,
    })
    return { username, stats: { ...EMPTY_STATS } }
  }

  return { username: rows[0].username, stats: normalize(rows[0].data) }
}

/**
 * Persists the full stats object for the signed-in user. No-op for guests.
 */
export async function saveStats(stats: StatsData): Promise<void> {
  const user = await getSessionUser()
  if (!user) return

  const clean = normalize(stats)
  const username = user.name || user.email.split('@')[0]

  await db
    .insert(gameStats)
    .values({ userId: user.id, username, data: clean, bestRun: clean.bestRun })
    .onConflictDoUpdate({
      target: gameStats.userId,
      set: { data: clean, bestRun: clean.bestRun, updatedAt: new Date() },
    })
}
