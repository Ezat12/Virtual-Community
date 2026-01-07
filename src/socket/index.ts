import { Server, Socket } from "socket.io";
import { authSocket } from "./middlewares/auth";
import { RoomManager } from "./managers/roomManager";
import {
  AuthorizationMessageCommunityServices,
  MessageCommunityRepository,
} from "../utils/socketIoServices/messageCommunity/communityMessages.repository";
import { CommunityMessageServices } from "../utils/socketIoServices/messageCommunity/communityMessage.services";
import { SocketMessageCommunity } from "../utils/socketIoServices/messageCommunity/socketMessageCommunity";
import { MessagePrivateRepository } from "../utils/socketIoServices/messagePrivate/messagePrivate.repository";
import { MessagePrivateServices } from "../utils/socketIoServices/messagePrivate/messagePrivate.services";
import { SocketMessagePrivate } from "../utils/socketIoServices/messagePrivate/socketMessagePrivate";
import { CommunityAdminsServices } from "../utils/socketIoServices/communityAdmins/communityAdmin.services";
import { CommunityAdminRepo } from "../utils/socketIoServices/communityAdmins/communityAdmin.repository";
import { SocketCommunityAdmin } from "../utils/socketIoServices/communityAdmins/socketCommunityAdmin";
import { CommunityMemberRepo } from "../utils/socketIoServices/communityMembers/communityMember.repo";
import { CommunityMemberEvent } from "../utils/socketIoServices/communityMembers/communityMember.event";
import { SocketCommunityMember } from "../utils/socketIoServices/communityMembers/socketCommunityMember";
import { CommunityMemberServices } from "../utils/socketIoServices/communityMembers/communityMember.service";
import { SocketPost } from "../utils/socketIoServices/posts/socketPost";
import { PostServices } from "../utils/socketIoServices/posts/post.service";
import { PostRepo } from "../utils/socketIoServices/posts/post.repo";

// Message Community
const repoCommunityMessage = new MessageCommunityRepository();
const authCommunityMessage = new AuthorizationMessageCommunityServices();
const communityMessageServices = new CommunityMessageServices(
  repoCommunityMessage,
  authCommunityMessage
);
// Message Private
const messagePrivateRepo = new MessagePrivateRepository();
const messagePrivateServices = new MessagePrivateServices(messagePrivateRepo);
// Community admin
const communityAdminRepo = new CommunityAdminRepo();
const communityAdminsServices = new CommunityAdminsServices(communityAdminRepo);

//post
const postRepo = new PostRepo();
const postServices = new PostServices(postRepo);

export const setupSocket = (io: Server) => {
  const socketMessageCommunity = new SocketMessageCommunity(
    io,
    communityMessageServices
  );

  const socketMessagePrivate = new SocketMessagePrivate(
    io,
    messagePrivateServices
  );

  const socketCommunityAdmin = new SocketCommunityAdmin(
    io,
    communityAdminsServices
  );

  const communityMemberServices = new CommunityMemberServices(
    new CommunityMemberRepo(),
    new CommunityMemberEvent(io)
  );
  const socketCommunityMember = new SocketCommunityMember(
    io,
    communityMemberServices
  );

  const socketPost = new SocketPost(io, postServices);

  authSocket(io);

  io.on("connection", (socket: Socket) => {
    const room = new RoomManager(socket);

    room.joinMember();

    socket.on("join-community", (communityId: number) => {
      room.joinCommunity(communityId);
    });

    socket.on("register", (userId: number) => {
      room.register(userId);
    });

    socket.on(
      "join-admin-room",
      (payload: {
        communityId: number;
        area: "users" | "posts" | "settings";
      }) => {
        room.joinAdmin(payload);
      }
    );

    socket.on(
      "leave-admin-room",
      (payload: {
        communityId: number;
        area: "users" | "posts" | "settings";
      }) => {
        room.leaveAdmin(payload);
      }
    );

    socket.on("disconnect", () => room.disconnect());

    socketMessageCommunity.MessageCommunityHandler(socket);
    socketMessagePrivate.messagePrivateHandler(socket);
    socketCommunityAdmin.CommunityAdminHandler(socket);
    socketCommunityMember.CommunityMemberHandler(socket);
    socketPost.SocketPostHandler(socket);
  });
};
