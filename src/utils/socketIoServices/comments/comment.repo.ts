import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { commentsSchema, postsSchema } from "../../../schemas";

export class CommentsRepo {
  async create(postId: number, userId: number, content: string) {
    const [comment] = await db
      .insert(commentsSchema)
      .values({
        postId: Number(postId),
        userId: userId,
        content,
      })
      .returning();

    return comment || null;
  }

  async getCommentsById(commentId: number) {
    const [comment] = await db
      .select()
      .from(commentsSchema)
      .where(eq(commentsSchema.id, Number(commentId)));

    return comment || null;
  }

  async update(commentId: number, content: string) {
    const [updateComment] = await db
      .update(commentsSchema)
      .set({ content })
      .where(eq(commentsSchema.id, commentId))
      .returning()
      .execute();

    return updateComment || null;
  }

  async delete(commentId: number) {
    const [deletedComment] = await db
      .delete(commentsSchema)
      .where(eq(commentsSchema.id, commentId))
      .returning()
      .execute();

    return deletedComment;
  }

  async getPostById(postId: number) {
    const [post] = await db
      .select()
      .from(postsSchema)
      .where(eq(postsSchema.id, postId));

    return post;
  }
}
