import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { messagePrivateSchema, usersSchema } from "../../../schemas";

export class MessagePrivateRepository {
  public async create(senderId: number, receiverId: number, content: string) {
    const [message] = await db
      .insert(messagePrivateSchema)
      .values({ senderId, receiverId, content })
      .returning();

    return message;
  }

  public async findMessageById(messageId: number) {
    const [message] = await db
      .select()
      .from(messagePrivateSchema)
      .where(eq(messagePrivateSchema.id, messageId));

    return message;
  }

  public async findUserById(receiverId: number) {
    const [user] = await db
      .select()
      .from(usersSchema)
      .where(eq(usersSchema.id, receiverId));

    return user || null;
  }

  public async update(messageId: number, content: string) {
    const [updateMessage] = await db
      .update(messagePrivateSchema)
      .set({ content })
      .where(eq(messagePrivateSchema.id, messageId))
      .returning();

    return updateMessage || null;
  }

  public async deleteMessage(messageId: number) {
    const [deleteMessage] = await db
      .update(messagePrivateSchema)
      .set({ deletedAt: new Date() })
      .where(eq(messagePrivateSchema.id, Number(messageId)))
      .returning();

    return deleteMessage || null;
  }
}
