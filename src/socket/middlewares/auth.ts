import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/apiError";

export const authSocket = (io: Server) => {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new ApiError("Authentication error", 401));
    try {
      const secretKey = process.env.SECRET_KEY_JWT;
      if (!secretKey) return next(new ApiError("Missing SECRET_KEY_JWT", 500));
      const user = jwt.verify(token, secretKey) as {
        id: number;
        [k: string]: any;
      };
      socket.data.user = user;
      next();
    } catch (e: unknown) {
      if (e instanceof Error) return next(new ApiError(e.message, 500));
      return next(new ApiError("Unknown error", 500));
    }
  });
};
