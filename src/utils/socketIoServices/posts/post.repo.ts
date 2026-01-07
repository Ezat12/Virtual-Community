import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { mentionsSchema, postsSchema } from "../../../schemas";

export class PostRepo {
  async create(
    userId: number,
    communityId: number,
    type: "text" | "image" | "video" | "mixed" = "text",
    content: string
  ) {
    const [post] = await db
      .insert(postsSchema)
      .values({
        userId: userId,
        communityId: communityId,
        type,
        content: content ?? null,
      })
      .returning();

    return post;
  }

  async getById(postId: number) {
    const [post] = await db
      .select()
      .from(postsSchema)
      .where(eq(postsSchema.id, Number(postId)));

    return post || null;
  }

  async update(postId: number, content: string) {
    await db
      .update(postsSchema)
      .set({ content: content ?? postsSchema.content })
      .where(eq(postsSchema.id, Number(postId)))
      .execute();
  }

  async delete(postId: number): Promise<void> {
    await db.delete(postsSchema).where(eq(postsSchema.id, postId));
  }

  async createMention(mentionsValues: { postId: number; userId: number }[]) {
    return await db.insert(mentionsSchema).values(mentionsValues).returning();
  }
}
