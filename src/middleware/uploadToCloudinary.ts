import { v2 as cloudinary } from "cloudinary";
import { Request, Response, NextFunction } from "express";
import streamifier from "streamifier";
import { uuidv4 } from "zod";

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
    const files = Array.isArray(req.files)
      ? req.files
      : req.file
      ? [req.file]
      : undefined;

    if (!files || files.length === 0) {
      req.body.media = [];
      req.body.avatarUrl = null;
      return next();
    }

    if (files.length === 1) {
      const file = files[0];
      if (!file.mimetype.startsWith("image/")) {
        return res
          .status(400)
          .json({ status: "error", error: "Profile picture must be an image" });
      }

      const result = await new Promise<{ secure_url: string }>(
        (resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: "image", public_id: `profile_${uuidv4()}` },
            (error, result) => {
              if (error) return reject(error);
              resolve(result as { secure_url: string });
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        }
      );

      req.body.avatarUrl = result.secure_url;
      req.body.media = [];
      return next();
    }

    const uploadPromises = files.map((file, index) => {
      return new Promise<{ secure_url: string; type: "image" | "video" }>(
        (resolve, reject) => {
          const resourceType = file.mimetype.startsWith("image/")
            ? "image"
            : "video";
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: resourceType,
              public_id: `post_media_${uuidv4()}`,
            },
            (error, result) => {
              if (error) return reject(error);
              resolve({
                secure_url: result!.secure_url,
                type: resourceType,
              });
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        }
      );
    });

    const results = await Promise.all(uploadPromises);
    req.body.media = results.map((result, index) => ({
      url: result.secure_url,
      type: result.type,
      order: index + 1,
    }));
    req.body.avatarUrl = null;
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: "error", error: "Media upload failed" });
  }
};
