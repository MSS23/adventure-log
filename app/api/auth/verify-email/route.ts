import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { emailService } from "@/lib/email";
import { serverEnv, isDevelopment } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

/**
 * Email Verification Endpoint
 * Handles email verification tokens for credential signup
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json(
        { error: "Missing verification token or email" },
        { status: 400 }
      );
    }

    // Find the verification token
    const verificationToken = await db.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    if (!verificationToken) {
      logger.warn("Invalid verification token attempt", {
        email,
        token: token.substring(0, 8) + "...",
      });
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await db.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: token,
          },
        },
      });

      return NextResponse.json(
        { error: "Verification token has expired" },
        { status: 400 }
      );
    }

    // Find the user and verify their email
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Mark email as verified
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Clean up the verification token
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    logger.info("Email verified successfully", { email, userId: user.id });

    // Redirect to sign-in page with success message
    return NextResponse.redirect(
      new URL("/auth/signin?message=EmailVerified", request.url)
    );
  } catch (error) {
    logger.error("Email verification error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Resend Email Verification
 * Generates a new verification token and sends email
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Apply rate limiting to prevent spam
    const rateLimitResult = await rateLimit("auth", email);
    if (!rateLimitResult.success) {
      logger.warn("Email verification rate limit exceeded", { email });
      return NextResponse.json(
        {
          error: "Too many verification requests. Please try again later.",
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ),
        },
        { status: 429 }
      );
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        {
          message:
            "If an account with this email exists, a verification email has been sent.",
        },
        { status: 200 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Generate new verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Clean up any existing tokens for this user
    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create new verification token
    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Generate verification URL
    const verificationUrl = `${serverEnv.NEXTAUTH_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(
      email,
      user.name || "User",
      verificationUrl
    );

    if (!emailSent) {
      logger.error("Failed to send verification email", { email });
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Verification email sent. Please check your inbox.",
      ...(isDevelopment() && {
        devLink: verificationUrl,
      }),
    });
  } catch (error) {
    logger.error("Resend verification error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
