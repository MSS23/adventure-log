import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import { getServerEnv, isDevelopment } from "./env";
import { db } from "./db";
import { logger } from "./logger";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  debug: isDevelopment(), // Only enable debug in development
  session: {
    strategy: "database", // Use database sessions with Prisma adapter
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 1 * 60 * 60, // Update session every 1 hour
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request", // Email verification page
  },
  providers: [
    GoogleProvider({
      clientId: getServerEnv().GOOGLE_CLIENT_ID,
      clientSecret: getServerEnv().GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true, // Prevents OAuthAccountNotLinked errors
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
      token: {
        params: {
          grant_type: "authorization_code",
        },
      },
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
    }),
    // Apple OAuth - conditionally added if environment variables are present
    ...(process.env.APPLE_ID && process.env.APPLE_SECRET
      ? [
          AppleProvider({
            clientId: process.env.APPLE_ID,
            clientSecret: process.env.APPLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
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

        // Block credentials login until email is verified
        if (!user.emailVerified && !isDevelopment) {
          logger.warn("User tried to login with unverified email:", {
            email: user.email,
          });
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
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // With database sessions, user comes from the database
      if (user && session.user) {
        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
            role: (user as any).role || "USER",
            username: (user as any).username,
          },
        };
      }

      return session;
    },
    async signIn({ user, account, profile }) {
      // Basic validation for all providers
      if (!user?.email) {
        logger.error("❌ Sign in failed: No email provided");
        return false;
      }

      // For OAuth providers, mark email as verified automatically
      if (account?.provider === "google" || account?.provider === "apple") {
        const isEmailVerified =
          account.provider === "apple"
            ? true
            : (profile as any)?.email_verified !== false;

        if (isEmailVerified) {
          try {
            await db.user.upsert({
              where: { email: user.email },
              update: {
                emailVerified: new Date(),
                // Update name and image if not set
                ...(user.name && { name: user.name }),
                ...(user.image && { image: user.image }),
              },
              create: {
                email: user.email,
                name: user.name || profile?.name || "Unknown User",
                image: user.image,
                emailVerified: new Date(),
              },
            });

            logger.debug(`✅ ${account.provider} OAuth user email verified:`, {
              email: user.email,
              provider: account.provider,
            });
          } catch (error) {
            logger.error(
              `❌ Failed to verify ${account.provider} OAuth user email:`,
              {
                error,
                provider: account.provider,
              }
            );
          }
        }
      }

      // Allow all sign-ins - let PrismaAdapter handle user creation/linking
      logger.debug("✅ Sign in allowed for:", {
        provider: account?.provider,
        email: user.email,
      });

      return true;
    },
  },

  // Security and cookie settings
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: !isDevelopment, // Only secure cookies in production
      },
    },
  },
};
