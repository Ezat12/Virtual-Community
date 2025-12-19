import { Server, Socket } from "socket.io";
import { HandlerError } from "../handlerError";
import { joinRequestPayload } from "../../../middleware/validation/validateCommunityMemberShip";

import { ApiError } from "../../apiError";
import { CommunityMemberServices } from "./communityMember.service";

export class SocketCommunityMember extends HandlerError {
  constructor(private io: Server, private services: CommunityMemberServices) {
    super();
  }

  CommunityMemberHandler(socket: Socket) {
    socket.on("add-member", (data) => {
      this.addMember(socket, data);
    });

    socket.on("leave-member", (data) => {
      this.leaveMember(socket, data);
    });

    socket.on("delete-member", (data) => {
      this.deleteMember(socket, data);
    });

    socket.on("handle-request", (data) => {
      this.handleJoinRequest(socket, data);
    });
  }

  private async addMember(socket: Socket, data: { communityId: number }) {
    try {
      const userId = socket.data.user.id;

      if (!userId) {
        throw new ApiError("You are not authorized. Please log in first.", 401);
      }

      const { community } = await joinRequestPayload(data.communityId, userId);

      const addMember = await this.services.addMember(userId, community);

      socket.emit("success-message", addMember);
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async leaveMember(socket: Socket, data: { communityId: number }) {
    try {
      const userId = socket.data.user.id;

      if (!userId) {
        throw new ApiError("You are not authorized. Please log in first.", 401);
      }

      const { communityId } = data;

      const leave = await this.services.leaveMember(
        userId,
        communityId,
        socket
      );

      socket.emit("success-message", leave);
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async deleteMember(
    socket: Socket,
    data: { communityId: number; memberId: number }
  ) {
    try {
      const userId = socket.data.user.id;

      const { communityId, memberId } = data;

      const member = await this.services.deleteMember(
        userId,
        communityId,
        memberId
      );

      socket.emit("success-message", {
        status: "success",
        message: "Remove member successfully",
        data: member,
      });
    } catch (e) {
      this.handleError(socket, e);
    }
  }

  private async handleJoinRequest(
    socket: Socket,
    data: {
      communityId: number;
      requestId: number;
      action: "pending" | "accepted" | "rejected";
    }
  ) {
    try {
      const userId = socket.data.user.id;

      const { communityId, requestId } = data;
      const { action } = data;

      if (!action) {
        throw new ApiError("Action must be required", 400);
      }

      if (!["accepted", "rejected"].includes(action)) {
        throw new ApiError("Invalid action", 400);
      }

      const request = await this.services.handlerRequest(
        communityId,
        userId,
        requestId,
        action
      );

      socket.emit("success-message", request);
    } catch (e) {
      this.handleError(socket, e);
    }
  }
}
