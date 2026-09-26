import { Request, Response } from "express";
import prisma from "../config/prisma";

export const addToWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let wishlist = await prisma.wishlist.findUnique({
      where: { userId },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: {
          userId,
        },
      });
    }

    const existingItem = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    const item = await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      },
      include: {
        product: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Product added to wishlist",
      item,
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add product to wishlist",
    });
  }
};

export const getWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        wishlist: null,
        totalItems: 0,
      });
    }

    return res.status(200).json({
      success: true,
      wishlist,
      totalItems: wishlist.items.length,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get wishlist",
    });
  }
};

export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    const item = await prisma.wishlistItem.findFirst({
      where: {
        id: itemId,
        wishlistId: wishlist.id,
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    await prisma.wishlistItem.delete({
      where: {
        id: itemId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
    });
  } catch (error) {
    console.error("Remove wishlist item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove product from wishlist",
    });
  }
};

export const clearWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    await prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
    });
  } catch (error) {
    console.error("Clear wishlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to clear wishlist",
    });
  }
};