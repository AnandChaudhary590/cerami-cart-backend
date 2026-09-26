import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

export const requireRole = (...allowedRoles: string[]) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      next();
    } catch (error) {
      console.error("Role middleware error:", error);

      return res.status(500).json({
        success: false,
        message: "Something went wrong",
      });
    }
  };
};