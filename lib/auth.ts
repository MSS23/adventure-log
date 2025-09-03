import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { serverEnv, isDevelopment } from "../src/env";
import { db } from "./db";
import { logger } from "./logger";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  debug: isDevelopment, // Only debug in development
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
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
    async signIn({ user, account }) {
      // Basic validation for all providers
      if (!user?.email) {
        logger.error("❌ Sign in failed: No email provided");
        return false;
      }

      // Allow all sign-ins - let PrismaAdapter handle user creation/linking
      logger.debug("✅ Sign in allowed for:", {
        provider: account?.provider,
        email: user.email,
      });
      
      return true;
    },
  },
};
