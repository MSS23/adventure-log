/**
 * Enhanced NextAuth type definitions with ultra-strict type safety
 */

import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Strict session interface with comprehensive user data
   */
  interface Session {
    readonly user: {
      readonly id: string;
      readonly email: string;
      readonly name: string | null;
      readonly image: string | null;
      readonly username: string | null;
      readonly emailVerified?: Date | null;
      readonly role: "USER" | "ADMIN" | "MODERATOR";
      readonly createdAt: Date;
      readonly isPublic: boolean;
      readonly stats: {
        readonly totalCountriesVisited: number;
        readonly totalAlbumsCount: number;
        readonly totalPhotosCount: number;
        readonly currentStreak: number;
        readonly longestStreak: number;
      };
    } & DefaultSession["user"];
    readonly expires: string;
    readonly accessToken?: string;
    readonly error?: "RefreshAccessTokenError";
  }

  /**
   * Strict user interface for authentication
   */
  interface User extends DefaultUser {
    readonly id: string;
    readonly email: string;
    readonly name: string | null;
    readonly image: string | null;
    readonly username: string | null;
    readonly emailVerified?: Date | null;
    readonly role: "USER" | "ADMIN" | "MODERATOR";
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly isPublic: boolean;
    readonly bio?: string | null;
    readonly location?: string | null;
    readonly website?: string | null;
  }

  /**
   * Strict account interface for OAuth providers
   */
  interface Account {
    readonly id: string;
    userId: string;
    type: "oauth" | "email" | "credentials";
    provider: string;
    providerAccountId: string;
    readonly refresh_token?: string | null;
    readonly access_token?: string | null;
    readonly expires_at?: number | null;
    readonly token_type?: string | null;
    readonly scope?: string | null;
    readonly id_token?: string | null;
    readonly session_state?: string | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * Strict JWT interface with comprehensive token data
   */
  interface JWT extends DefaultJWT {
    readonly id: string;
    readonly username?: string | null;
    readonly role: "USER" | "ADMIN" | "MODERATOR";
    readonly emailVerified?: Date | null;
    readonly accessToken?: string;
    readonly refreshToken?: string;
    readonly accessTokenExpires?: number;
    readonly error?: "RefreshAccessTokenError";
    readonly provider?: string;
    readonly isPublic?: boolean;
  }
}
