import { Request, Response } from "express";
import prisma from "../config/prisma";

export const createAddress = async(req: Request, res: Response)=>{
    try{
        const userId = req.user?.userId;

        if(!userId){
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const {
            type,
            fullName,
            phone,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country,
            isDefault,
        } = req.body;

        if(
            !fullName ||
            !phone ||
            !addressLine1 ||
            !city ||
            !state ||
            !postalCode
        ){
            return res.status(400).json({
               success: "Required address fields are missing", 
            });
        }

        if(isDefault === true){
            await prisma.address.updateMany({
                where: {userId},
                data: {isDefault: false}, 
            });
        }

        const address = await prisma.address.create({
            data:{
                type: type || "HOME",
                fullName,
                phone,
                addressLine1,
                addressLine2: addressLine2 || null,
                city,
                state,
                postalCode,
                country: country || "India",
                isDefault: isDefault === true,
                userId,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Address created successfully",
            address,
        });
    }catch(error){
        console.error("Create address error:", error);

        return res.status(500).json({
            success: "Failed to create address",
        });
    }
};

export const getAddresses = async (req: Request, res: Response)=>{
    try{
        const userId = req.user?.userId;

        if(!userId){
            return res.status(401).json({
                success: "Unauthorized",
            });
        }

        const addresses = await prisma.address.findMany({
            where:{userId},
            orderBy:[
                {isDefault: "desc"},
                {createdAt: "desc"},
            ],
        });

        return res.status(200).json({
            success: true,
            addresses,
            totalAddresses: addresses.length,
        });
    }catch(error){
        console.error("Get addresses error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to get addresses",
        });
    } 
};

export const updateAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const existingAddress = await prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const {
      type,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body;

    if (isDefault === true) {
      await prisma.address.updateMany({
        where: {
          userId,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(fullName !== undefined && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(addressLine1 !== undefined && { addressLine1 }),
        ...(addressLine2 !== undefined && { addressLine2 }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(postalCode !== undefined && { postalCode }),
        ...(country !== undefined && { country }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    console.error("Update address error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update address",
    });
  }
};

export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const address = await prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    await prisma.address.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Delete address error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete address",
    });
  }
};