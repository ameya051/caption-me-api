import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const waitlist = pgTable('waitlist', {
    id: serial('id').primaryKey(),
    email: varchar('email').notNull(),
});

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).default('user'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const tokens = pgTable('tokens', {
    id: serial('id').primaryKey(),
    userId: serial('user_id').notNull().references(() => users.id),
    token: varchar('token', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'access' or 'refresh'
});
