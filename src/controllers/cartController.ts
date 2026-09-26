import { Request, Response } from "express";
import prisma from "../config/prisma";

export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { productId, quantity } = req.body;

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

    const requestedQuantity = quantity ?? 1;

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
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

    if (product.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Product is not available",
      });
    }

    if (product.stock < requestedQuantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
        },
      });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    let cartItem;

    if (existingItem) {
      const newQuantity = existingItem.quantity + requestedQuantity;

      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: "Requested quantity exceeds available stock",
        });
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
        },
        include: {
          product: true,
        },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: requestedQuantity,
        },
        include: {
          product: true,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Product added to cart successfully",
      cartItem,
    });
  } catch (error) {
    console.error("Add to cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
    });
  }
};

export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const cart = await prisma.cart.findUnique({
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

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: {
          id: null,
          items: [],
          totalItems: 0,
          totalAmount: 0,
        },
      });
    }

    const totalItems = cart.items.reduce(
      (total, item) => total + item.quantity,
      0
    );

    const totalAmount = cart.items.reduce(
      (total, item) => total + Number(item.product.price) * item.quantity,
      0
    );

    return res.status(200).json({
      success: true,
      cart: {
        id: cart.id,
        items: cart.items,
        totalItems,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get cart",
    });
  }
};

export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      include: {
        product: true,
      },
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    if (cartItem.product.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Product is not available",
      });
    }

    if (quantity > cartItem.product.stock) {
      return res.status(400).json({
        success: false,
        message: "Requested quantity exceeds available stock",
      });
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity,
      },
      include: {
        product: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated successfully",
      cartItem: updatedItem,
    });
  } catch (error) {
    console.error("Update cart item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update cart item",
    });
  }
};

export const removeCartItem = async(req: Request, res: Response)=>{
    try{
        const userId = req.user?.userId;
        const {itemId} = req.params;

        if(!userId){
            return res.status(401).json({
              success: false,
              message: "Unauthorized",
            });
        }

        const cart = await prisma.cart.findUnique({
            where: {userId},
        });

        if(!cart){
            return res.status(404).json({
                success: false,
                message: "Cart not found",
            });
        }

        const cartItem = await prisma.cartItem.findFirst({
            where:{
                id: itemId,
                cartId: cart.id, 
            },
        });

        if(!cartItem){
            return res.status(404).json({
                success: false,
                message: "Cart item not found",
            });
        }

        await res.status(200).json({
            success: true,
            message: "Cart item remove successfully",
        });

    }catch(error){
        console.error("Remove cart item error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to remove cart item",
        });
    }
};

export const clearCart = async (req: Request, res: Response)=>{
    try{
        const userId = req.user?.userId;

        if(!userId){
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const cart = await prisma.cart.findUnique({
            where: {userId},
        });

        if(!cart){
            return res.status(404).json({
                success: false,
                message: "Cart not found",
            });
        }

        await prisma.cartItem.deleteMany({
            where:{
                cartId: cart.id,
            },
        });
        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
        });
    }catch(error){
        console.error("Clear cart error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to clear cart",
        });
    }
};