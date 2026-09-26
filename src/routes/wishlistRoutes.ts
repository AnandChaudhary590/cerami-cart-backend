import { Router } from "express";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../controllers/wishlistController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authMiddleware, getWishlist);
router.post("/", authMiddleware, addToWishlist);
router.delete("/:itemId", authMiddleware, removeFromWishlist);
router.delete("/", authMiddleware, clearWishlist);

export default router;