import { Server, Socket } from "socket.io";
import { HandlerError } from "../handlerError";
import { ApiError } from "../../apiError";
import { commentsServices } from "./comment.service";

export class SocketComment extends HandlerError {
  constructor(private io: Server, private service: commentsServices) {
    super();
  }

  public commentSocketHandler(socket: Socket) {
    socket.on("new-comment", (data: { postId: number; content: string }) =>
      this.newComment(socket, data)
    );

    socket.on(
      "update-comment",
      (data: { commentId: number; content: string }) =>
        this.updateComment(socket, data)
    );

    socket.on("delete-comment", (data: { commentId: number }) =>
      this.deleteComment(socket, data)
    );
  }

  private async newComment(
    socket: Socket,
    data: { postId: number; content: string }
  ) {
    try {
      const user = socket.data.user;

      if (!user) {
        throw new ApiError(
          "You are not authenticated. Please log in first.",
          401
        );
      }

      const { comment, post } = await this.service.newComment(
        user.id,
        user.name,
        data.postId,
        data.content
      );

      this.io.to(`user:${post.createdAt}`).emit("new_comment", comment);
      socket.emit("success-message", {
        status: "success",
        data: comment,
      });
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async updateComment(
    socket: Socket,
    data: { commentId: number; content: string }
  ) {
    try {
      const user = socket.data.user;

      if (!user) {
        throw new ApiError(
          "You are not authenticated. Please log in first.",
          401
        );
      }

      const comment = await this.service.updateComment(
        data.commentId,
        user.id,
        data.content
      );

      socket.emit("success-message", {
        status: "success",
        message: "Update comment successfully",
        data: comment,
      });
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async deleteComment(socket: Socket, data: { commentId: number }) {
    try {
      const user = socket.data.user;

      if (!user) {
        throw new ApiError(
          "You are not authenticated. Please log in first.",
          401
        );
      }

      await this.service.deleteComment(data.commentId, user.id);

      socket.emit("success-message", {
        status: "success",
        message: "Deleted comment successfully",
      });
    } catch (e) {
      this.handleError(socket, e);
    }
  }
}
