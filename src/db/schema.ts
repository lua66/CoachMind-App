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

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  players: many(players),
  drills: many(drills),
  matches: many(matches),
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
