import { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";

const fileFilterSingle = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  const allowedImageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".jfif"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    file.mimetype.startsWith("image/") &&
    allowedImageExtensions.includes(ext)
  ) {
    // ) {
    callback(null, true);
  } else {
    callback(new Error("Only images (PNG, JPG, JPEG, GIF, JFIF) are allowed!"));
  }
};

const fileFilterMulti = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  const allowedImageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".jfif", ".avif"];
  const allowedVideoExtensions = [".mp4"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    (file.mimetype.startsWith("image/") &&
      allowedImageExtensions.includes(ext)) ||
    (file.mimetype.startsWith("video/") && allowedVideoExtensions.includes(ext))
  ) {
    callback(null, true);
  } else {
    callback(
      new Error(
        "Only images (PNG, JPG, JPEG, GIF, JFIF) and videos (MP4) are allowed!"
      )
    );
  }
};


export const uploadSingle = (file: string) => {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilterSingle,
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
  }).single(file);
};

export const uploadMultiple = (fieldName: string, maxCount: number) => {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilterMulti,
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: maxCount,
    },
  }).array(fieldName, maxCount);
};
