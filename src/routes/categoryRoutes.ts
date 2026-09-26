import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
} from "../controllers/categoryController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

const router = Router();

// Public: Get all categories
router.get("/", getCategories);
router.get("/:id", getCategoryById);

// Admin: Create category
router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN"),
  createCategory
);

export default router;