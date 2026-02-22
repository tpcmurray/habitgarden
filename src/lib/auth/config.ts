import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Build providers based on available environment variables
const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// If no providers are configured, use a mock for development
if (providers.length === 0) {
  console.warn('⚠️ No auth providers configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable authentication.');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, user.email),
      });

      if (!existingUser) {
        // Create new user
        const newUser = await db.insert(users).values({
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
          oauthProvider: account?.provider,
          oauthId: account?.providerAccountId,
        }).returning({ id: users.id });
        
        // Store user ID in token for session
        return true;
      }

      return true;
    },
    async session({ session, token }) {
      // Add user ID from token if available
      if (token?.sub) {
        session.user.id = token.sub;
      } else if (session.user?.email) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, session.user.email),
        });
        if (dbUser) {
          session.user.id = dbUser.id.toString();
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      // Add user ID to token on initial sign in
      if (user) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email!),
        });
        if (dbUser) {
          token.sub = dbUser.id.toString();
        }
      }
      return token;
    },
  },
  pages: {
    signIn: '/', // Use custom sign-in page (landing page)
  },
});
