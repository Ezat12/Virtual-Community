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

import path from "path";
import { setupSocket } from "./socket";

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

setupSocket(io);

const port = process.env.PORT || 4040;

server.listen(port, () => {
  console.log(`server is ready on port ${port}`);
});
