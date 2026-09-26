import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/productController";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

const router = Router();

// Public: Get all products
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin: Create product
router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN"),
  createProduct
);

router.put(
    "/:id",
    authMiddleware,
    requireRole("ADMIN"),
    updateProduct
);

router.delete(
    "/:id",
    authMiddleware,
    requireRole("ADMIN"),
    deleteProduct
);

export default router;