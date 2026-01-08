import { ApiError } from "../../apiError";
import { NotificationService } from "../../notificationService";
import { CommentsRepo } from "./comment.repo";

export class commentsServices {
  constructor(private repo: CommentsRepo) {}

  async newComment(
    userId: number,
    name: string,
    postId: number,
    content: string
  ) {
    const comment = await this.repo.create(postId, userId, content);

    const post = await this.repo.getPostById(comment.postId);

    await NotificationService.commentedPost(userId, name);

    return { comment, post };
  }

  async updateComment(commentId: number, userId: number, content: string) {
    const comment = await this.repo.getCommentsById(commentId);
    if (!comment) {
      throw new ApiError("Comment not found", 404);
    }

    if (comment.userId !== userId) {
      throw new ApiError("you are not authorized to update this comment", 403);
    }

    const commentUpdated = await this.repo.update(comment.id, content);

    return commentUpdated;
  }

  async deleteComment(commentId: number, userId: number) {
    const comment = await this.repo.getCommentsById(commentId);

    if (!comment) {
      throw new ApiError("Comment not found", 404);
    }

    if (comment.userId !== userId) {
      throw new ApiError("you are not authorized to delete this comment", 403);
    }

    await this.repo.delete(comment.id);
  }
}
