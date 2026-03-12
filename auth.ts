import NextAuth from 'next-auth';
import LinkedIn from 'next-auth/providers/linkedin';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './lib/db';
import { accounts, users, verificationTokens, voiceProfiles } from './lib/db/schema';
import { eq } from 'drizzle-orm';
import { upsertLinkedInAccount } from '@/lib/linkedin/account-sync';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: 'openid profile email w_member_social',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) {
        return;
      }

      const existingProfile = await db.query.voiceProfiles.findFirst({
        where: eq(voiceProfiles.userId, user.id),
      });

      if (!existingProfile) {
        await db.insert(voiceProfiles).values({
          userId: user.id,
        });
      }
    },
    async signIn({ user, account, profile }) {
      if (
        account?.provider !== 'linkedin' ||
        !user.id ||
        !account.access_token ||
        !account.providerAccountId
      ) {
        return;
      }

      const expiresAt = account.expires_at
        ? new Date(account.expires_at * 1000)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const profileData = (profile ?? {}) as {
        name?: string | null;
      };

      await upsertLinkedInAccount({
        userId: user.id,
        linkedinId: account.providerAccountId,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        expiresAt,
        displayName: user.name ?? profileData.name ?? null,
      });
    },
  },
});

