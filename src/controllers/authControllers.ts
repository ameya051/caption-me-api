import passport from "passport";
import { Request, Response } from "express";
import { users, tokens } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import logger from "../logger";
import { generateTokens } from "../util/tokenHelpers";
import { db } from "../db";
import { customRequest } from '../types/customRequest';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser.length > 0) {
      res.status(409).json({
        success: false,
        message: "User already exists",
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        role: "user",
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
      });

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(
      newUser.id,
      newUser.email,
      newUser.role || "user"
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating user",
    });
  }
};

export const login = async (req: customRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    const user = existingUsers[0];

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({
        success: false,
        message: "Invalid password",
      });
      return;
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(
      user.id,
      user.email,
      user.role || "user"
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Error during login",
    });
  }
};

export const logout = async (req: customRequest, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await db.delete(tokens).where(eq(tokens.token, refreshToken));
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });

    res.json({
      success: true,
      message: "Successfully logged out",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Error during logout",
    });
  }
};

export const refresh = async (req: customRequest, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
      return;
    }

    // Validate refresh token in database
    const [tokenRecord] = await db
      .select({
        userId: tokens.userId,
        expiresAt: tokens.expiresAt,
        email: users.email,
        role: users.role,
      })
      .from(tokens)
      .innerJoin(users, eq(tokens.userId, users.id))
      .where(eq(tokens.token, refreshToken));

    if (!tokenRecord) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
      return;
    }

    await db.delete(tokens).where(eq(tokens.token, refreshToken));

    if (new Date() > tokenRecord.expiresAt) {
      res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
      return;
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
      tokenRecord.userId,
      tokenRecord.email,
      tokenRecord.role || "user"
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true
    });
  } catch (error) {
    logger.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "Error refreshing token",
    });
  }
};

export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

export const googleCallback = async (req: customRequest, res: Response) => {
  passport.authenticate(
    "google",
    { session: false },
    async (err: any, user: any) => {
      if (err || !user) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/signin?error=oauth-failed`
        );
      }

      try {
        const { accessToken, refreshToken } = await generateTokens(
          user.id,
          user.email,
          user.role || "user"
        );

        res.cookie("accessToken", accessToken, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
      } catch (error) {
        res.redirect(
          `${process.env.FRONTEND_URL}/signin?error=token-generation-failed`
        );
      }
    }
  )(req, res);
};

export const githubAuth = passport.authenticate("github", {
  scope: ["user:email"],
});

export const githubCallback = async (req: customRequest, res: Response) => {
  passport.authenticate("github", async (err: any, user: any) => {
    if (err || !user) {
      logger.error("GitHub OAuth error:", err);
      return res.redirect(
        `${process.env.FRONTEND_URL}/signin?error=oauth-failed`
      );
    }

    try {
      // Generate tokens
      const { accessToken, refreshToken } = await generateTokens(
        user.id,
        user.email,
        user.role || "user"
      );

      // You might want to send these tokens in a more secure way
      res.redirect(
        `${process.env.FRONTEND_URL}/success?access_token=${accessToken}&refresh_token=${refreshToken}`
      );
    } catch (error) {
      res.redirect(
        `${process.env.FRONTEND_URL}/signin?error=token-generation-failed`
      );
    }
  })(req, res);
};

export const getMe = async (req: customRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        provider: users.provider,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, Number(req.user.id)));

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user information",
    });
  }
};
