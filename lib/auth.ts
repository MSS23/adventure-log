import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { db } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: true, // Enable debug mode to capture OAuth errors
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    async session({ token, session }) {
      if (token) {
        return {
          ...session,
          user: {
            ...session.user,
            id: token.id as string,
            name: token.name as string,
            email: token.email as string,
            image: token.picture as string,
            username: token.username as string,
          },
        };
      }

      return session;
    },
    async jwt({ token, user, account }) {
      console.log("🎫 JWT callback triggered", {
        hasToken: !!token,
        hasUser: !!user,
        hasAccount: !!account,
        accountProvider: account?.provider,
        userEmail: user?.email,
        tokenSub: token?.sub,
      });

      if (account && user) {
        try {
          console.log("🔍 JWT: First time sign in, looking up user in database");
          
          // First time sign in
          const dbUser = await db.user.findUnique({
            where: {
              email: user.email || "",
            },
          });

          if (dbUser) {
            console.log("✅ JWT: Database user found", { 
              userId: dbUser.id, 
              username: dbUser.username 
            });
            
            return {
              ...token,
              id: dbUser.id,
              username: dbUser.username || undefined,
            };
          } else {
            console.warn("⚠️ JWT: No database user found for email:", user.email);
          }
        } catch (error) {
          console.error("❌ JWT callback error:", {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            userEmail: user?.email,
            accountProvider: account?.provider,
          });
        }
      }

      console.log("🔄 JWT: Returning existing token");
      return token;
    },
    async signIn({ user, account, profile: _profile }) {
      console.log("🔐 SignIn callback triggered", {
        provider: account?.provider,
        hasAccount: !!account,
        hasUser: !!user,
        userEmail: user?.email,
        accountType: account?.type,
      });

      if (account?.provider === "google") {
        try {
          console.log("📊 Google OAuth data:", {
            accountId: account.providerAccountId,
            accessToken: account.access_token ? "present" : "missing",
            refreshToken: account.refresh_token ? "present" : "missing",
            expiresAt: account.expires_at,
            tokenType: account.token_type,
            scope: account.scope,
          });

          if (!user.email) {
            console.error("❌ Google sign in failed: No email provided");
            return false;
          }

          const existingUser = await db.user.findUnique({
            where: { email: user.email },
          });

          if (existingUser) {
            console.log("✅ Google sign in: Existing user found", { userId: existingUser.id });
            return true;
          }

          // Create new user
          const newUser = await db.user.create({
            data: {
              email: user.email,
              name: user.name || "",
              image: user.image,
              // Generate username from email
              username: user.email.split("@")[0].toLowerCase(),
            },
          });

          console.log("✅ Google sign in: New user created", { userId: newUser.id });
          return true;
        } catch (error) {
          console.error("❌ Error during Google sign in:", {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            userEmail: user?.email,
            accountProvider: account?.provider,
            accountId: account?.providerAccountId,
          });
          return false;
        }
      }

      console.log("✅ Non-Google sign in allowed");
      return true;
    },
  },
};
