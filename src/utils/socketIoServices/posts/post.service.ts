import { ApiError } from "../../apiError";
import { PostRepo } from "./post.repo";

export class PostServices {
  constructor(private repo: PostRepo) {}

  async updatePost(postId: number, content: string, userId: number) {
    const post = await this.repo.getById(postId);

    if (!post) {
      throw new ApiError("Post not found", 404);
    }

    if (post.userId !== userId) {
      throw new ApiError("You are not authorized to update this post", 403);
    }

    await this.repo.update(postId, content);

    return post.communityId;
  }

  async deletePost(postId: number, userId: number) {
    const post = await this.repo.getById(postId);

    if (!post) {
      throw new ApiError("Post not found", 404);
    }

    if (post.userId !== userId) {
      throw new ApiError("You are not authorized to delete this post", 403);
    }

    const deleted = await this.repo.delete(postId);

    return deleted;
  }
}
