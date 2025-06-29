import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Check if user exists
        const existingUsers = await db.select()
          .from(users)
          .where(eq(users.email, email));

        let user = existingUsers[0];

        if (!user) {
          // Create new user
          const [newUser] = await db.insert(users)
            .values({
              email,
              password: '', // No password for OAuth users
              role: 'user',
              provider: 'google',
              providerId: profile.id
            })
            .returning();

          user = newUser;
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GH_CLIENT_ID!,
      clientSecret: process.env.GH_CLIENT_SECRET!,
      callbackURL: '/api/auth/github/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error('No email found in GitHub profile'));
        }

        // Check if user exists
        const existingUsers = await db.select()
          .from(users)
          .where(eq(users.email, email));

        let user = existingUsers[0];

        if (!user) {
          // Create new user
          const [newUser] = await db.insert(users)
            .values({
              email,
              password: '', // No password for OAuth users
              role: 'user',
              provider: 'github',
              providerId: profile.id
            })
            .returning();

          user = newUser;
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, id));
    done(null, user);
  } catch (error) {
    done(error as Error);
  }
});
