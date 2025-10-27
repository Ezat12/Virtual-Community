import express, { Response, Request, NextFunction } from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { errorHandler } from "./middleware/errorHandler";
import { ApiError } from "./utils/apiError";
import userRoute from "./routes/user.route";
import authRoute from "./routes/auth.route";
import communityRoute from "./routes/communities.routes";
import communityAdminRoute from "./routes/communityAdmins.route";
import postsRoute from "./routes/post.route";
import likesRoutes from "./routes/likes.routes";
import commentsRoutes from "./routes/comment.route";
import messageCommunityRoutes from "./routes/messageCommunity.route";
import messagePrivateRoutes from "./routes/messagePrivate.route";
import notificationsRoutes from "./routes/notification.route";
import { createServer } from "http";
import { Server } from "socket.io";
import { messageCommunitySchema as MessageCommunity } from "./schemas";

import path from "path";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { SocketMessageCommunity } from "./utils/socketIoServices/socketMessageCommunity";
import { SocketMessagePrivate } from "./utils/socketIoServices/socketMessagePrivate";
const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

dotenv.config();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/v1/users", userRoute);
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/communities", communityRoute);
app.use("/api/v1/community-admin", communityAdminRoute);
app.use("/api/v1/posts", postsRoute);
app.use("/api/v1/likes", likesRoutes);
app.use("/api/v1/comments", commentsRoutes);
app.use("/api/v1/message-community", messageCommunityRoutes);
app.use("/api/v1/message-private", messagePrivateRoutes);
app.use("/api/v1/notifications", notificationsRoutes);

app.use((req: Request, res: Response, next: NextFunction) => {
  next(new ApiError("route is not success", 404));
});

app.use(errorHandler);

const usersConnection = new Map<number, Set<string>>();
const socketMessageCommunity = new SocketMessageCommunity(io);
const socketMessagePrivate = new SocketMessagePrivate(io);

io.use((socket, next) => {
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

io.on("connection", (socket) => {
  const user = socket.data.user as { id: number } | undefined;
  if (user?.id) {
    socket.join(`user:${user.id}`);
    const set = usersConnection.get(user.id) ?? new Set<string>();
    set.add(socket.id);
    usersConnection.set(user.id, set);
  }

  socket.on("join-community", async (communityId: string) => {
    const cid = Number(communityId);
    if (!user) return socket.emit("error-message", "Unauthorized");
    // const isMember = await checkIfUserIsMember(user.id, cid); // نفذ استعلام DB هنا
    // if (!isMember) return socket.emit("error-message", "You are not a member");
    socket.join(`community:${cid}`);
  });

  socket.on("register", (userId: number) => {
    if (user?.id !== userId)
      return socket.emit("error-message", "Invalid register");
    const set = usersConnection.get(userId) ?? new Set<string>();
    set.add(socket.id);
    usersConnection.set(userId, set);
  });

  socketMessageCommunity.MessageCommunityHandler(socket);
  socketMessagePrivate.messagePrivateHandler(socket);

  socket.on("disconnect", () => {
    const uid = socket.data.user?.id;
    if (typeof uid === "number") {
      const set = usersConnection.get(uid);
      set?.delete(socket.id);
      if (!set || set.size === 0) usersConnection.delete(uid);
    } else {
      usersConnection.forEach((sockets, id) => {
        sockets.delete(socket.id);
        if (sockets.size === 0) usersConnection.delete(id);
      });
    }
  });
});

const port = process.env.PORT || 4040;

server.listen(port, () => {
  console.log(`server is ready on port ${port}`);
});
