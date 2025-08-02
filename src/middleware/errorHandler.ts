import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err.name === "TokenExpiredError") {
    err = errorExpiredToken();
  }
  if (err.name === "JsonWebTokenError") {
    err = errorInvalidToken();
  }
  const statusCode: number = err instanceof ApiError ? err.statusCode : 500;
  const state: string = err instanceof ApiError ? err.state : "error";

  res.status(statusCode).json({
    status: state,
    message: err.message,
    stack: err.stack,
  });
};

const errorExpiredToken = () =>
  new ApiError("Your session has expired. Please log in again.", 401);

const errorInvalidToken = () =>
  new ApiError("Your token is invalid. Please log in again." , 401);
