import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { db } from "../db";
import { and, desc, eq, inArray, InferSelectModel, sql } from "drizzle-orm";
import {
  communitiesSchema as Community,
  communityMembershipsSchema as CommunityMemberships,
  postsSchema as Post,
  usersSchema as User,
  postMediaSchema as PostMedia,
} from "../schemas";
import { ApiError } from "../utils/apiError";
import { ApiFeatures } from "../utils/ApiFeatures";

export const createPost = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { content } = req.body;
    const user = req.user;
    const community = req.community;

    const media = req.body.media as
      | {
          url: string;
          type: "image" | "video";
          order: number;
        }[]
      | undefined;

    let type: "text" | "image" | "video" | "mixed" = "text";
    if (content && media && media.length > 0) {
      type = "mixed";
    } else if (media && media.length > 0) {
      type = media.every((m) => m.type === "image") ? "image" : "video";
      if (
        media.some((m) => m.type === "image") &&
        media.some((m) => m.type === "video")
      ) {
        type = "mixed";
      }
    }

    const [post] = await db
      .insert(Post)
      .values({
        userId: user.id,
        communityId: community.id,
        type,
        content: content ?? null,
      })
      .returning();

    let mediaAll: { url: string; type: "image" | "video"; order: number }[] =
      [];
    if (media && media.length > 0) {
      try {
        const mediaValues = media.map((med) => ({
          postId: post.id,
          url: med.url,
          type: med.type,
          order: med.order,
        }));

        mediaAll = await db.insert(PostMedia).values(mediaValues).returning();
      } catch (e) {
        await db.delete(Post).where(eq(Post.id, post.id));

        return next(new ApiError("Failed to add media to post", 500));
      }
    }

    res.status(201).json({
      status: "success",
      message: "Created Post successfully",
      data: {
        post,
        media: mediaAll,
      },
    });
  }
);

export const getAllPosts = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const user = req.user;
    const { communityId } = req.params;

    const [community] = await db
      .select()
      .from(Community)
      .where(eq(Community.id, Number(communityId)));

    if (!community) {
      return next(new ApiError("Community not found", 404));
    }

    const [communityMember] = await db
      .select()
      .from(CommunityMemberships)
      .where(
        and(
          eq(CommunityMemberships.communityId, community.id),
          eq(CommunityMemberships.userId, req.user.id)
        )
      );

    if (!communityMember && community.privacy === "private") {
      return next(new ApiError("User is not a member of this community", 403));
    }

    const queryWithCommunity = {
      ...req.query,
      communityId: community.id.toString(),
    };

    const feature = new ApiFeatures(db, Post, queryWithCommunity, {
      id: Post.id,
      userId: Post.userId,
      communityId: Post.communityId,
      content: Post.content,
      type: Post.type,
      createdAt: Post.createdAt,
      username: User.name,
      email: User.email,
      avatarUrl: User.avatarUrl,
    });

    const finalQuery = feature
      .filter()
      .selectFields()
      .sort()
      .paginate()
      .join(User, eq(User.id, Post.userId), "inner")
      .build();

    const posts = await finalQuery;

    const countFeature = new ApiFeatures(db, Post, req.query, {
      count: sql<number>`COUNT(*)`,
    });
    const countQuery = countFeature.filter().build();
    const [totalCount] = await countQuery;

    if (!posts.length) {
      return res.status(200).json({
        status: "success",
        results: 0,
        totalCount: Number(totalCount.count),
        currentPage: parseInt(req.query.page as string) || 1,
        totalPages: Math.ceil(
          Number(totalCount.count) / (Number(req.query.limit) || 10)
        ),
        data: { posts: [] },
      });
    }

    const postIds = posts.map((post) => post.id);

    const media = await db
      .select({
        mediaId: PostMedia.id,
        postId: PostMedia.postId,
        mediaUrl: PostMedia.url,
        mediaType: PostMedia.type,
        mediaOrder: PostMedia.order,
      })
      .from(PostMedia)
      .where(inArray(PostMedia.postId, postIds))
      .orderBy(PostMedia.order);

    const postsWithMedia = posts.map((post) => ({
      ...post,
      media: media
        .filter((m) => m.postId === post.id)
        .map((m) => ({
          mediaId: m.mediaId,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          mediaOrder: m.mediaOrder,
        })),
    }));

    res.status(200).json({
      status: "success",
      results: postsWithMedia.length,
      totalCount: Number(totalCount.count),
      currentPage: parseInt(req.query.page as string) || 1,
      totalPages: Math.ceil(
        Number(totalCount.count) / (Number(req.query.limit) || 10)
      ),
      data: { posts: postsWithMedia },
    });
  }
);

const resPostData = (
  user: InferSelectModel<typeof User>,
  post: InferSelectModel<typeof Post>,
  media: { id: number; url: string; type: "image" | "video" }[]
) => {
  return {
    id: post.id,
    content: post.content,
    type: post.type,
    createdAt: post.createdAt,
    user: user
      ? {
          id: user.id,
          name: user.name,
          avatar: user.avatarUrl,
        }
      : undefined,
    media: media.map((m) => ({
      id: m.id,
      url: m.url,
      type: m.type,
    })),
  };
};

export const getPostById = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;
    const user = req.user;

    const [post] = await db
      .select()
      .from(Post)
      .where(eq(Post.id, Number(postId)));

    if (!post) {
      return next(new ApiError("Post not found", 404));
    }

    const media = await db
      .select()
      .from(PostMedia)
      .where(eq(PostMedia.postId, post.id));

    res.status(200).json({
      status: "success",
      data: resPostData(user, post, media),
    });
  }
);

export const updatePost = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;
    const content = req.body?.content;
    const user = req.user;

    const [post] = await db
      .select()
      .from(Post)
      .where(eq(Post.id, Number(postId)));

    if (!post) {
      return next(new ApiError("Post not found", 404));
    }

    if (post.userId !== user.id) {
      return next(
        new ApiError("You are not authorized to update this post", 403)
      );
    }

    await db
      .update(Post)
      .set({ content: content ?? post.content })
      .where(eq(Post.id, Number(postId)))
      .execute();

    res.status(200).json({
      status: "success",
      message: "Post updated successfully",
    });
  }
);

export const deletePost = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;

    await db
      .delete(Post)
      .where(eq(Post.id, Number(postId)))
      .execute();

    res.status(200).json({
      status: "success",
      message: "Post deleted successfully",
    });
  }
);
