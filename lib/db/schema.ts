import { pgTable, text, timestamp, boolean, serial, integer, jsonb } from 'drizzle-orm/pg-core'

export type CaughtPokemon = {
  dex: number
  name: string
  types: string[]
  bst: number
  baseBst?: number
  gen?: number
  tier?: number
  keptAt?: number
  isShiny?: boolean
  isLegendary?: boolean
  isMissingNo?: boolean
  evolvesTo?: string | null
}

export type StatsData = {
  bestRun: number
  totalWins: number
  legendariesCaught: number
  shiniesCaught: number
  totalRuns: number
  bestRunNoReroll: number
  shinyChampion: number
  metMissingNo: number
  achievements: string[]
  pokedex: CaughtPokemon[]
  seen: number[]
}

export const EMPTY_STATS: StatsData = {
  bestRun: 0,
  totalWins: 0,
  legendariesCaught: 0,
  shiniesCaught: 0,
  totalRuns: 0,
  bestRunNoReroll: 0,
  shinyChampion: 0,
  metMissingNo: 0,
  achievements: [],
  pokedex: [],
  seen: [],
}

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------
// One row per user holding all Elite Four game progression. The full stats
// object lives in `data` (JSONB) so the game's stat shape can evolve without
// schema migrations. `bestRun` is denormalized for future leaderboards.
// Scoped by userId (no RLS on Neon, so every query filters by userId).

export const gameStats = pgTable('game_stats', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull().unique(),
  username: text('username').notNull(),
  data: jsonb('data').notNull().default({}).$type<StatsData>(),
  bestRun: integer('bestRun').notNull().default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export type GameStats = typeof gameStats.$inferSelect
