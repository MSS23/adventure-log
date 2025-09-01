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
  debug: process.env.NODE_ENV === "development",
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
      if (account && user) {
        // First time sign in
        const dbUser = await db.user.findUnique({
          where: {
            email: user.email || "",
          },
        });

        if (dbUser) {
          return {
            ...token,
            id: dbUser.id,
            username: dbUser.username || undefined,
          };
        }
      }

      return token;
    },
    async signIn({ user, account, profile: _profile }) {
      if (account?.provider === "google") {
        try {
          if (!user.email) {
            return false;
          }

          const existingUser = await db.user.findUnique({
            where: { email: user.email },
          });

          if (existingUser) {
            return true;
          }

          // Create new user
          await db.user.create({
            data: {
              email: user.email,
              name: user.name || "",
              image: user.image,
              // Generate username from email
              username: user.email.split("@")[0].toLowerCase(),
            },
          });

          return true;
        } catch (error) {
          console.error("Error during Google sign in:", error);
          return false;
        }
      }

      return true;
    },
  },
};
