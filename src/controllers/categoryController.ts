import { Request, Response } from "express";
import prisma from "../config/prisma";

export const createCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, slug, description, image } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Name and slug are required",
      });
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category with this name or slug already exists",
      });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

export const getCategories = async (
  req: Request,
  res: Response
) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};
export const getCategoryById = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get category by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};