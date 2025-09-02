import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { db } from "./db";
import { logger } from "./logger";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  debug: true, // Enable debug mode to capture OAuth errors
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          return null;
        }

        // For OAuth users, password might not be set
        if (!user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        } as any;
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // With database sessions, user data comes from the database
      if (user && session.user) {
        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
            name: user.name || session.user.name,
            email: user.email || session.user.email,
            image: user.image || session.user.image,
            username: (user as any).username || undefined,
          },
        };
      }

      return session;
    },
    async signIn({ user, account, profile: _profile }) {
      logger.debug("🔐 SignIn callback triggered", {
        provider: account?.provider,
        hasAccount: !!account,
        hasUser: !!user,
        userEmail: user?.email,
        accountType: account?.type,
      });

      if (account?.provider === "google") {
        logger.debug("📊 Google OAuth data:", {
          accountId: account.providerAccountId,
          accessToken: account.access_token ? "present" : "missing",
          refreshToken: account.refresh_token ? "present" : "missing",
          expiresAt: account.expires_at,
          tokenType: account.token_type,
          scope: account.scope,
        });

        if (!user.email) {
          logger.error("❌ Google sign in failed: No email provided");
          return false;
        }

        // Check if we need to generate a username for new users
        try {
          const existingUser = await db.user.findUnique({
            where: { email: user.email },
          });

          if (!existingUser && user.email) {
            // Generate username for new user - PrismaAdapter will create the user
            // but we can set additional fields here
            logger.debug("🆕 New Google user will be created by PrismaAdapter", { 
              email: user.email 
            });
          } else {
            logger.debug("✅ Google sign in: Existing user found", { 
              userId: existingUser?.id 
            });
          }
        } catch (error) {
          logger.warn("⚠️ Error checking existing user, continuing with sign in:", error);
        }

        return true;
      }

      logger.debug("✅ Non-Google sign in allowed");
      return true;
    },
  },
};
