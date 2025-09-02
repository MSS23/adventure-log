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
      allowDangerousEmailAccountLinking: true, // Prevents OAuthAccountNotLinked errors
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

        // Ensure user exists with proper default values
        try {
          const existingUser = await db.user.findUnique({
            where: { email: user.email }
          });

          if (!existingUser) {
            logger.debug("🆕 Creating new user with default values");
            await db.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: user.image,
                username: user.email?.split('@')[0] + '_' + Math.random().toString(36).substr(2, 4),
                isPublic: true,
                // Initialize travel statistics
                totalCountriesVisited: 0,
                totalAlbumsCount: 0,
                totalPhotosCount: 0,
                currentStreak: 0,
                longestStreak: 0,
                totalDistanceTraveled: 0,
              }
            });
            
            logger.debug("✅ New user created successfully");
          }
        } catch (error) {
          logger.error("❌ Error handling user creation:", error);
          // Don't block login if user creation fails - PrismaAdapter will handle it
        }

        logger.debug("✅ Google sign in: Allowing PrismaAdapter to handle user creation/linking");
        return true;
      }

      logger.debug("✅ Non-Google sign in allowed");
      return true;
    },
  },
};
