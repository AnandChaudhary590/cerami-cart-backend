import { Router } from "express";

import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  logout,
  googleLogin,
} from "../controllers/authController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);

router.post("/login", login);

router.post("/google", googleLogin);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.get("/me", authMiddleware, getCurrentUser);

router.post("/logout", logout);


export default router;