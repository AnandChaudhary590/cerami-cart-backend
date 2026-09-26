import { Router } from "express";
import { addToCart,
         getCart, 
         updateCartItem,
         removeCartItem,
         clearCart,
 } from "../controllers/cartController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post(
    "/",
    authMiddleware,
    addToCart
);

router.get(
  "/",
  authMiddleware,
  getCart
);

router.put(
  "/:itemId",
  authMiddleware,
  updateCartItem
);

router.delete(
  "/:itemId",
  authMiddleware,
  removeCartItem
);

router.delete("/", authMiddleware, clearCart);

export default router;