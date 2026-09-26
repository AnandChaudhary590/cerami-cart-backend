import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { success, z } from "zod";
import crypto from "crypto";

import prisma from "../config/prisma";
import { generateToken } from "../utils/jwt";
import { sendPasswordResetEmail } from "../utils/sendEmail";

import { OAuth2Client } from "google-auth-library";
// ===============================
// REGISTER VALIDATION
// ===============================
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),

  phone: z
    .string()
    .trim()
    .optional(),
});

// ===============================
// REGISTER
// ===============================

export const register = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const { name, email, password, phone } = result.data;

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while registering",
    });
  }
};

// ===============================
// LOGIN VALIDATION
// ===============================

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),

  password: z
    .string()
    .min(1, "Password is required"),
});

// ===============================
// LOGIN
// ===============================

export const login = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const { email, password } = result.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    // User not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check account status
    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}`,
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT
    const token = generateToken(user.id, user.role);

    // Store JWT in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while logging in",
    });
  }
};

// ===============================
// FORGOT PASSWORD
// ===============================

export const forgotPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const emailResult = z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .safeParse(req.body.email);

    if (!emailResult.success) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required",
      });
    }

    const email = emailResult.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    // Don't reveal whether email exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If the email exists, a password reset link has been sent",
      });
    }

    // Delete previous reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Token expires in 15 minutes
    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    // Save token in database
    const savedToken = await prisma.passwordResetToken.create({
  data: {
    token: resetToken,
    userId: user.id,
    expiresAt,
  },
});

console.log("RESET TOKEN SAVED:", savedToken);
    // Create frontend reset URL
    const frontendUrl =
      process.env.FRONTEND_URL || "http://localhost:3000";

    const resetLink =
      `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email
    await sendPasswordResetEmail(
      user.email,
      resetLink
    );

    return res.status(200).json({
      success: true,
      message:
        "If the email exists, a password reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// ===============================
// RESET PASSWORD VALIDATION
// ===============================

const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Reset token is required"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

// ===============================
// RESET PASSWORD
// ===============================

export const resetPassword = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate request body
    const result = resetPasswordSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const { token, password } = result.data;

    // Find reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: {
        token,
      },
    });

    // Token not found
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Check token expiry
    if (resetToken.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({
        where: {
          id: resetToken.id,
        },
      });

      return res.status(400).json({
        success: false,
        message: "Reset token has expired",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password
    await prisma.user.update({
      where: {
        id: resetToken.userId,
      },
      data: {
        password: hashedPassword,
      },
    });

    // Delete used reset token
    await prisma.passwordResetToken.delete({
      where: {
        id: resetToken.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while resetting password",
    });
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}`,
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// ===============================
// LOGOUT
// ===============================

export const logout = async (
  _req: Request,
  res: Response
) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while logging out",
    });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google account",
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || "Google User";
    const picture = payload.picture;

    let user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email },
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          googleId,
          password: "",
          role: "CUSTOMER",
          status: "ACTIVE",
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}`,
      });
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        picture,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);

    return res.status(401).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};