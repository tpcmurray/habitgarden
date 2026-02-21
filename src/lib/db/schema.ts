import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ============== USERS ==============
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  oauthProvider: varchar('oauth_provider', { length: 50 }),
  oauthId: varchar('oauth_id', { length: 255 }),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  notificationPreferences: jsonb('notification_preferences').default({
    reminderEnabled: true,
    reminderTime: '09:00',
    streakCelebrations: true,
    reEngagement: true,
  }),
  onesignalPlayerId: varchar('onesignal_player_id', { length: 255 }),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============== HABITS ==============
export const habits = pgTable(
  'habits',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    emojiBuddy: varchar('emoji_buddy', { length: 10 }).notNull(),
    direction: varchar('direction', { length: 10 }).notNull().default('build'), // 'build' or 'break'
    type: varchar('type', { length: 10 }).notNull().default('binary'), // 'binary' or 'measured'
    targetValue: integer('target_value'),
    targetUnit: varchar('target_unit', { length: 50 }),
    frequency: varchar('frequency', { length: 20 }).notNull().default('daily'), // 'daily', 'weekdays', 'weekends', 'custom'
    customDays: jsonb('custom_days').default([false, false, false, false, false, false, false]), // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
    reminderTime: varchar('reminder_time', { length: 10 }),
    active: boolean('active').default(true),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('habits_user_id_idx').on(table.userId),
  })
);

// ============== CHECK-INS ==============
export const checkIns = pgTable(
  'check_ins',
  {
    id: serial('id').primaryKey(),
    habitId: integer('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD format
    completed: boolean('completed').default(false),
    value: integer('value'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    habitDateIdx: uniqueIndex('check_ins_habit_date_idx').on(table.habitId, table.date),
    userIdIdx: index('check_ins_user_id_idx').on(table.userId),
  })
);

// ============== MILESTONES ==============
export const milestones = pgTable(
  'milestones',
  {
    id: serial('id').primaryKey(),
    habitId: integer('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(), // 'streak_7', 'streak_30', 'streak_100'
    cosmetic: jsonb('cosmetic'), // { type: 'hat', value: 'party-hat' }
    earnedAt: timestamp('earned_at').defaultNow().notNull(),
    streakSnapshot: integer('streak_snapshot'),
  },
  (table) => ({
    userIdIdx: index('milestones_user_id_idx').on(table.userId),
  })
);

// ============== TYPE EXPORTS ==============
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type CheckIn = typeof checkIns.$inferSelect;
export type NewCheckIn = typeof checkIns.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
