import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isDevelopment } from "@/src/env";

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
        emailVerified: isDevelopment ? new Date() : null, // Auto-verify in dev
      },
    });

    // Generate email verification token (skip in development)
    if (!isDevelopment) {
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db.verificationToken.create({
        data: {
          identifier: email,
          token: verificationToken,
          expires,
        },
      });

      // TODO: Send verification email in production
      // const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

      logger.info("User created - verification email needed:", {
        email,
        userId: user.id,
      });

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
    logger.error("Signup error:", error);

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
