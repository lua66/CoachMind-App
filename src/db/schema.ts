import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

// Users table (linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Players table
export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  jerseyNumber: integer('jersey_number'),
  role: text('role').notNull(),
  height: text('height'),
  weight: text('weight'),
  strengths: jsonb('strengths').$type<string[]>(),
  areasToImprove: jsonb('areas_to_improve').$type<string[]>(),
  notes: text('notes'),
  stats: jsonb('stats'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Coach Philosophy table
export const philosophies = pgTable('philosophies', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  playStyle: text('play_style'),
  offensiveFocus: text('offensive_focus'),
  defensiveFocus: text('defensive_focus'),
  trainingGoals: text('training_goals'),
  matchGoals: text('match_goals'),
  coreValues: text('core_values'),
  additionalNotes: text('additional_notes'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Training Drills table
export const drills = pgTable('drills', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  category: text('category'),
  duration: integer('duration'),
  description: text('description'),
  objectives: jsonb('objectives').$type<string[]>(),
  isFavorite: boolean('is_favorite').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Matches table
export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  opponent: text('opponent').notNull(),
  date: text('date').notNull(),
  location: text('location'),
  ourScore: integer('our_score'),
  opponentScore: integer('opponent_score'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Annual Planning - Season Goals
export const seasonGoals = pgTable('season_goals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  temporada: text('temporada').notNull(),
  categoria: text('categoria').notNull(),
  objetivoPrincipal: text('objetivo_principal').notNull(),
  objetivosDeportivos: jsonb('objetivos_deportivos').$type<string[]>(),
  objetivosFormativos: jsonb('objetivos_formativos').$type<string[]>(),
  estiloDeJuego: text('estilo_de_juego'),
  fechaInicio: text('fecha_inicio'),
  fechaFin: text('fecha_fin'),
  philosophySnapshot: jsonb('philosophy_snapshot').$type<any>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Annual Planning - Mesocycles
export const mesocycles = pgTable('mesocycles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  seasonGoalId: integer('season_goal_id')
    .references(() => seasonGoals.id, { onDelete: 'cascade' }),
  numero: integer('numero').notNull(),
  nombre: text('nombre').notNull(),
  fechaInicio: text('fecha_inicio'),
  fechaFin: text('fecha_fin'),
  objetivoPrincipal: text('objetivo_principal'),
  estado: text('estado').default('planificado'), // 'planificado' | 'activo' | 'cerrado'
  resumenCierre: text('resumen_cierre'),
  goals: jsonb('goals').$type<any[]>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Annual Planning - Microcycles
export const microcycles = pgTable('microcycles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  mesocycleId: integer('mesocycle_id')
    .references(() => mesocycles.id, { onDelete: 'cascade' }),
  semana: integer('semana').notNull(),
  fechaInicio: text('fecha_inicio'),
  fechaFin: text('fecha_fin'),
  objetivoSemanal: text('objetivo_semanal'),
  cargasPlanificadas: jsonb('cargas_planificadas').$type<any>(),
  goalIds: jsonb('goal_ids').$type<string[]>(),
  estado: text('estado').default('planificado'), // 'planificado' | 'activo' | 'cerrado'
  sessions: jsonb('sessions').$type<any[]>(),
  evaluation: jsonb('evaluation').$type<any>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  players: many(players),
  drills: many(drills),
  matches: many(matches),
  seasonGoals: many(seasonGoals),
  mesocycles: many(mesocycles),
  microcycles: many(microcycles),
  philosophy: one(philosophies, {
    fields: [users.id],
    references: [philosophies.userId],
  }),
}));

export const playersRelations = relations(players, ({ one }) => ({
  user: one(users, {
    fields: [players.userId],
    references: [users.id],
  }),
}));

export const philosophiesRelations = relations(philosophies, ({ one }) => ({
  user: one(users, {
    fields: [philosophies.userId],
    references: [users.id],
  }),
}));

export const drillsRelations = relations(drills, ({ one }) => ({
  user: one(users, {
    fields: [drills.userId],
    references: [users.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  user: one(users, {
    fields: [matches.userId],
    references: [users.id],
  }),
}));
