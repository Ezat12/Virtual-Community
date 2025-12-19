import { ApiError } from "../../apiError";
import { ActionTypes, CommunityMemberRepo } from "./communityMember.repo";
import { NotificationService } from "../../notificationService";
import { CommunityMemberEvent } from "./communityMember.event";
import { InferSelectModel } from "drizzle-orm";
import { communitiesSchema } from "../../../schemas";
import { Socket } from "socket.io";
import {
  CanManageUsers,
  CommunityMemberAuth,
  IsOwner,
} from "./communityMember.auth";

type communityType = InferSelectModel<typeof communitiesSchema>;

export class CommunityMemberServices {
  constructor(
    private repo: CommunityMemberRepo,
    private event: CommunityMemberEvent
  ) {}

  async addMember(userId: number, community: communityType) {
    const existingMember = await this.repo.getMember(userId, community.id);

    if (existingMember) {
      if (!existingMember.removedAt) {
        throw new ApiError("You are already a member in this community", 400);
      }

      if (existingMember.removedAt) {
        const joinRequest = await this.repo.joinRequest(community.id, userId);

        this.event.eventAdminUsers(community.id, joinRequest);

        return {
          status: "success",
          message: "Your join request is pending approval",
          data: joinRequest,
        };
      }

      if (community.privacy === "public") {
        const reactivated = await this.repo.updateMember(
          null,
          null,
          existingMember.id,
          community.id
        );

        const auditLogs = await this.repo.auditLogs(
          community.id,
          userId,
          userId,
          ActionTypes.JOIN,
          "public"
        );

        this.event.eventAditLogs(community.id, auditLogs);

        const [notification] = await NotificationService.joinedCommunity(
          userId,
          community.name
        );

        this.event.eventNotificationToUser(userId, notification);

        return {
          status: "success",
          message: "Welcome back to the community",
          data: reactivated,
        };
      } else {
        const joinRequest = await this.repo.joinRequest(community.id, userId);

        this.event.eventAdminUsers(community.id, joinRequest);

        return {
          status: "success",
          message: "Your join request is pending approval",
          data: joinRequest,
        };
      }
    }

    if (community.privacy === "public") {
      const communityMember = await this.repo.createMember(
        community.id,
        userId
      );

      const auditlogs = await this.repo.auditLogs(
        community.id,
        userId,
        userId,
        ActionTypes.JOIN,
        "public"
      );

      this.event.eventAditLogs(community.id, auditlogs);

      const [notification] = await NotificationService.joinedCommunity(
        userId,
        community.name
      );

      this.event.eventNotificationToUser(userId, notification);

      return {
        status: "success",
        message: "Added member successfully",
        data: communityMember,
      };
    } else {
      const joinRequest = await this.repo.joinRequest(community.id, userId);

      this.event.eventAdminUsers(community.id, joinRequest);

      return {
        status: "success",
        message: "Your join request is pending approval",
        data: joinRequest,
      };
    }
  }

  async leaveMember(userId: number, communityId: number, socket: Socket) {
    const community = await this.repo.getCommunityById(communityId);

    if (!community) {
      throw new ApiError("Community not found", 404);
    }

    if (community.createdBy === userId) {
      throw new ApiError("Community owners cannot leave their community", 400);
    }

    const member = await this.repo.getMember(userId, community.id);

    if (!member) {
      throw new ApiError("Member not found", 404);
    }

    const updateMember = await this.repo.updateMember(
      new Date(),
      null,
      member.id,
      community.id
    );

    const auditLogs = await this.repo.auditLogs(
      community.id,
      userId,
      userId,
      ActionTypes.LEAVE,
      "public"
    );

    this.event.eventLeaveUser(socket, community.id);

    this.event.eventAditLogs(community.id, auditLogs, socket, true);

    return {
      status: "success",
      message: "Deleted member successfully",
      data: member,
    };
  }

  async deleteMember(userId: number, communityId: number, memberId: number) {
    const community = await this.repo.getCommunityById(communityId);

    if (!community) {
      throw new ApiError("Community not found", 404);
    }

    const member = await this.repo.getMember(memberId, community.id);

    if (!member) {
      throw new ApiError("Not found member in this community", 404);
    }

    const manageUser = new CanManageUsers();
    const isOwner = new IsOwner();

    const communityMemberAuth = new CommunityMemberAuth([manageUser, isOwner]);

    const ok = await communityMemberAuth.checkAny({
      communityId: community.id,
      userId,
      createdBy: community.createdBy!,
    });

    if (!ok) {
      throw new ApiError("You are not authorized to delete this user", 403);
    }

    if (userId === memberId) {
      throw new ApiError("Admins cannot remove themselves", 400);
    }

    const updateMember = await this.repo.updateMember(
      new Date(),
      userId,
      memberId,
      community.id
    );

    const auditLogs = await this.repo.auditLogs(
      community.id,
      userId,
      updateMember.id,
      ActionTypes.REMOVE,
      "public"
    );

    this.event.eventAditLogs(community.id, auditLogs);

    return {
      status: "success",
      message: "Remove member successfully",
      data: member,
    };
  }

  async handlerRequest(
    communityId: number,
    userId: number,
    requestId: number,
    action: "accepted" | "rejected" | "pending"
  ) {
    const community = await this.repo.getCommunityById(communityId);

    if (!community) {
      throw new ApiError("Community not found", 404);
    }

    const manageUser = new CanManageUsers();
    const isOwner = new IsOwner();

    const communityMemberAuth = new CommunityMemberAuth([manageUser, isOwner]);

    const ok = await communityMemberAuth.checkAny({
      communityId: community.id,
      userId,
      createdBy: community.createdBy!,
    });

    if (!ok) {
      throw new ApiError("You are not authorized to delete this user", 403);
    }

    const request = await this.repo.getRequestById(requestId);

    if (!request) {
      throw new ApiError("Request not found", 404);
    }

    const existingMember = await this.repo.getMember(
      request.userId!,
      community.id
    );

    if (existingMember) {
      throw new ApiError("User is already a member of the community", 400);
    }

    const updateRequest = await this.repo.updateRequestStatus(
      action,
      request.id,
      community.id
    );

    if (!updateRequest) {
      throw new ApiError("Request ot found", 404);
    }

    if (action === "accepted") {
      await this.repo.createMember(request.userId!, community.id);
      const auditLogs = await this.repo.auditLogs(
        community.id,
        userId,
        request.userId!,
        ActionTypes.ACCEPT,
        "public"
      );

      this.event.eventAditLogs(community.id, auditLogs);

      const [notification] = await NotificationService.joinedCommunity(
        request.userId!,
        community.name
      );

      this.event.eventNotificationToUser(request.userId!, notification);
    } else {
      const auditLogs = await this.repo.auditLogs(
        community.id,
        userId,
        request.userId!,
        ActionTypes.REJECT,
        "private"
      );

      const [notification] = await NotificationService.rejectedCommunity(
        request.userId!,
        community.name
      );

      this.event.eventNotificationToUser(request.userId!, notification);
    }

    this.repo.deleteRequest(request.id);

    return { status: "success", data: request };
  }
}
