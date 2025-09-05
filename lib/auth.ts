import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { serverEnv, isDevelopment } from "./env";
import { db } from "./db";
import { logger } from "./logger";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  debug: isDevelopment, // Only debug in development
  session: {
    strategy: "jwt", // Use JWT for sessions
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 1 * 60 * 60, // Update session every 1 hour
  },
  jwt: {
    maxAge: 8 * 60 * 60, // 8 hours
    secret: serverEnv.NEXTAUTH_SECRET,
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request", // Email verification page
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
          logger.warn("User tried to login with unverified email:", { email: user.email });
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
    async jwt({ token, user }) {
      // Initial sign in - store user data in JWT
      if (user) {
        return {
          ...token,
          userId: user.id,
          role: (user as any).role || "USER",
          username: (user as any).username,
        };
      }

      // Return previous token if the access token has not expired yet
      return token;
    },

    async session({ session, token }) {
      // Send properties to the client from JWT token
      if (token && session.user) {
        return {
          ...session,
          user: {
            ...session.user,
            id: token.userId as string,
            role: token.role as string,
            username: token.username as string,
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

      // For Google OAuth, mark email as verified automatically
      if (account?.provider === "google") {
        if ((profile as any)?.email_verified !== false) {
          try {
            await db.user.upsert({
              where: { email: user.email },
              update: {
                emailVerified: new Date(),
              },
              create: {
                email: user.email,
                name: user.name || profile?.name || "Unknown User",
                image: user.image,
                emailVerified: new Date(),
              },
            });

            logger.debug("✅ Google OAuth user email verified:", { user.email });
          } catch (error) {
            logger.error("❌ Failed to verify Google OAuth user email:", { error: error });
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
