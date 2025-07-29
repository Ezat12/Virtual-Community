import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode: number = err instanceof ApiError ? err.statusCode : 500;
  const state: string = err instanceof ApiError ? err.state : "error";

  res.status(statusCode).json({
    status: state,
    message: err.message,
    stack: err.stack,
  });
};
