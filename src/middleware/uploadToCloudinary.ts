import { v2 as cloudinary } from "cloudinary";
import { Request, Response, NextFunction } from "express";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

export const uploadToCloudinary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) return next();

    const streamUpload = () =>
      new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result as { secure_url: string });
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

    const result = await streamUpload();

    req.body.avatarUrl = result.secure_url;
    next();
  } catch (e) {
    console.log(e);
    res.status(500).json({ status: "error", error: "Image upload failed" });
  }
};
