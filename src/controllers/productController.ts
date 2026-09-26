import { Request, Response } from "express";
import prisma from "../config/prisma";

export const createProduct = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      comparePrice,
      sku,
      stock,
      categoryId,
    } = req.body;

    if (
      !name ||
      !slug ||
      !description ||
      price === undefined ||
      !sku ||
      !categoryId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, slug, description, price, SKU and category are required",
      });
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [{ slug }, { sku }],
      },
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "Product with this slug or SKU already exists",
      });
    }

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price,
        comparePrice,
        sku,
        stock: stock ?? 0,
        categoryId,
      },
      include: {
        category: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

export const getProducts = async (
  req: Request,
  res: Response
) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        images: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

export const getProductById = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
        images: true,
        reviews: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

export const updateProduct = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const {
      name,
      slug,
      description,
      price,
      comparePrice,
      sku,
      stock,
      status,
      categoryId,
    } = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (slug && slug !== existingProduct.slug) {
      const slugExists = await prisma.product.findUnique({
        where: { slug },
      });

      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: "Product slug already exists",
        });
      }
    }

    if (sku && sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku },
      });

      if (skuExists) {
        return res.status(400).json({
          success: false,
          message: "Product SKU already exists",
        });
      }
    }

    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(comparePrice !== undefined && { comparePrice }),
        ...(sku !== undefined && { sku }),
        ...(stock !== undefined && { stock }),
        ...(status !== undefined && { status }),
        ...(categoryId !== undefined && { categoryId }),
      },
      include: {
        category: true,
        images: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

export const deleteProduct = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};