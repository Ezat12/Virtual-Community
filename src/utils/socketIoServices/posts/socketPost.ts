import { Server, Socket } from "socket.io";
import { HandlerError } from "../handlerError";
import { InferSelectModel } from "drizzle-orm";
import { mentionsSchema, postMediaSchema, postsSchema } from "../../../schemas";
import { ApiError } from "../../apiError";
import { PostServices } from "./post.service";

type TypePost = InferSelectModel<typeof postsSchema>;
type TypePostMedia = InferSelectModel<typeof postMediaSchema>;
type TypeMention = InferSelectModel<typeof mentionsSchema>;

type DataNewPost = {
  post: TypePost;
  media: TypePostMedia[];
  mentions: TypeMention[];
  communityId: number;
};

export class SocketPost extends HandlerError {
  constructor(private io: Server, private services: PostServices) {
    super();
  }

  public SocketPostHandler(socket: Socket) {
    socket.on("new-post", (data: DataNewPost) => this.newPost(socket, data));
    socket.on("update-post", (data: { postId: number; content: string }) =>
      this.updatePost(socket, data)
    );

    socket.on("delete-post", (data: { postId: number }) =>
      this.deletePost(socket, data)
    );
  }

  private newPost(socket: Socket, data: DataNewPost) {
    const user = socket.data.user;

    if (!user) {
      throw new ApiError(
        "You are not authenticated. Please log in first.",
        401
      );
    }

    try {
      this.io.to(`community:${data.communityId}`).emit("new_post", data);
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async updatePost(
    socket: Socket,
    data: { postId: number; content: string }
  ) {
    const userId = socket.data.user.id;
    const { postId, content } = data;

    if (!userId) {
      throw new ApiError(
        "You are not authenticated. Please log in first.",
        401
      );
    }

    try {
      const communityId = await this.services.updatePost(
        postId,
        content,
        userId
      );

      this.io.to(`community:${communityId}`).emit("update_post", {
        status: "success",
        message: "Post updated successfully",
      });
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async deletePost(socket: Socket, data: { postId: number }) {
    const userId = socket.data.user.id;

    if (!userId) {
      throw new ApiError(
        "You are not authenticated. Please log in first.",
        401
      );
    }

    try {
      const communityId = await this.services.deletePost(data.postId, userId);

      this.io.to(`community:${communityId}`).emit("delete_post", {
        status: "success",
        message: "Post deleted successfully",
      });
    } catch (e) {
      this.handleError(socket, e);
    }
  }
}
