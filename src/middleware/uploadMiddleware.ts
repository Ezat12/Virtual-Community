import { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, "./uploads");
  },
  filename(req, file, callback) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    callback(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  const allowedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".jfif"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype.startsWith("image/") || allowedExtensions.includes(ext)) {
    callback(null, true);
  } else {
    callback(new Error("Only image files are allowed!"));
  }
};
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
