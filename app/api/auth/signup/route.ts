import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { emailService } from "@/lib/email";
import { serverEnv, isDevelopment } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const { name, email, password } = signupSchema.parse(body);

    // Apply rate limiting to prevent spam signups
    const rateLimitResult = await rateLimit("auth", email);
    if (!rateLimitResult.success) {
      logger.warn("Signup rate limit exceeded", { email });
      return NextResponse.json(
        {
          error: "Too many signup attempts. Please try again later.",
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ),
        },
        { status: 429 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Check if username already exists (generated from email)
    const username = email.split("@")[0].toLowerCase();
    let finalUsername = username;
    let counter = 1;

    while (await db.user.findUnique({ where: { username: finalUsername } })) {
      finalUsername = `${username}${counter}`;
      counter++;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (email not verified yet for credentials signup)
    const user = await db.user.create({
      data: {
        name,
        email,
        username: finalUsername,
        password: hashedPassword,
        emailVerified: isDevelopment() ? new Date() : null, // Auto-verify in dev
      },
    });

    // Generate email verification token (skip in development)
    if (!isDevelopment()) {
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db.verificationToken.create({
        data: {
          identifier: email,
          token: verificationToken,
          expires,
        },
      });

      // Send verification email
      const verificationUrl = `${serverEnv.NEXTAUTH_URL}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

      const emailSent = await emailService.sendVerificationEmail(
        email,
        name,
        verificationUrl
      );

      logger.info("User created", {
        email,
        userId: user.id,
        emailSent,
      });

      if (!emailSent) {
        logger.error("Failed to send verification email during signup", {
          email,
        });
        // Don't fail signup if email fails, but log it
      }

      return NextResponse.json(
        {
          message:
            "Account created successfully! Please check your email to verify your account before signing in.",
          requiresVerification: true,
        },
        { status: 201 }
      );
    }

    // Return success (don't include password)
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        message: "User created successfully",
        user: userWithoutPassword,
        requiresVerification: false,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Signup error", {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
