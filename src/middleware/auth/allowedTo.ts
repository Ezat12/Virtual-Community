import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { ApiError } from "../../utils/apiError";

export const allowedTo = (...roles: string[]) => {
  expressAsyncHandler((req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError("You are not logged in", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not allowed to perform this action", 403)
      );
    }

    next();
  });
};
