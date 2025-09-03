import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
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
      logger.warn("Invalid verification token attempt:", { email, token });
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

    logger.info("Email verified successfully:", { email, userId: user.id });

    // Redirect to sign-in page with success message
    return NextResponse.redirect(
      new URL("/auth/signin?message=EmailVerified", request.url)
    );
  } catch (error) {
    logger.error("Email verification error:", error);
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

    // In development, log the verification link
    const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    if (process.env.NODE_ENV === "development") {
      logger.info("🔗 Email verification link (DEV ONLY):", verificationUrl);
      console.log("\n📧 EMAIL VERIFICATION LINK (DEVELOPMENT):");
      console.log(`   ${verificationUrl}\n`);
    }

    // TODO: In production, send actual email using nodemailer or your email service
    // await sendVerificationEmail(email, user.name || 'User', verificationUrl);

    return NextResponse.json({
      message: "Verification email sent. Please check your inbox.",
      ...(process.env.NODE_ENV === "development" && {
        devLink: verificationUrl,
      }),
    });
  } catch (error) {
    logger.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// TODO: Implement email verification sending in the future
// For now, email verification is handled manually through the verification route
