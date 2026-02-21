import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, user.email),
      });

      if (!existingUser) {
        // Create new user
        await db.insert(users).values({
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
          oauthProvider: account?.provider,
          oauthId: account?.providerAccountId,
        });
      }

      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const user = await db.query.users.findFirst({
          where: eq(users.email, session.user.email),
        });

        if (user) {
          session.user.id = user.id.toString();
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/', // Use custom sign-in page (landing page)
  },
});
