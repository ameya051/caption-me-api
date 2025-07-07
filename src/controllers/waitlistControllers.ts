import { Request, Response } from 'express';
import { db } from '../db';
import { waitlist } from '../db/schema';
import { eq } from 'drizzle-orm';

export const addToWaitlist = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: 'Email is required.' });
            return
        }

        const existingEntry = await db.select().from(waitlist).
        where(eq(email, waitlist.email));
        if (existingEntry.length > 0) {
            res.status(409).json({ success: false, message: "You're already in the waitlist." });
            return;
        }

        await db.insert(waitlist).values({ email }).returning();
        res.status(201).json({ success: true, message: `You've been added to waitlist.` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add to waitlist.' });
    }
}
