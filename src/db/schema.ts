import { pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const waitlist = pgTable('waitlist', {
    id: serial('id').primaryKey(),
    email: varchar('email').notNull(),
});
