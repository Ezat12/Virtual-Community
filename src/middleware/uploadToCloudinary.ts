import { v2 as cloudinary } from "cloudinary";
import { Request, Response, NextFunction } from "express";
import { Express } from "express";

cloudinary.config({
  cloud_name: "dult28qzc",
  api_key: "992179586322812",
  api_secret: "XiqY32YcEmIRLLo-bGIFOfbvFwY",
});

export const uploadToCloudinary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file?.path, {
        resource_type: "auto",
      });

      req.body.avatarUrl = result.secure_url;
      next();
    }
  } catch (e) {
    return res
      .status(500)
      .json({ status: "error", error: "Image upload failed" });
  }
};
