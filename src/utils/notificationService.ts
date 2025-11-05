import {
  addNotification,
  TypeNotifications,
} from "../controllers/notification.controller";

export class NotificationService {

  // لما حد يعمل Like
  static async likedPost(userId: number, likerName: string) {
    return await addNotification(
      userId,
      `${likerName} liked your post ❤️`,
      TypeNotifications.Like
    );
  }

  static async likedComment(userId: number, likerName: string) {
    return await addNotification(
      userId,
      `${likerName} liked your comment 👍`,
      TypeNotifications.LikeComment
    );
  }

  // لما حد يعمل Comment
  static async commentedPost(userId: number, commenterName: string) {
    return await addNotification(
      userId,
      `${commenterName} commented on your post 💬`,
      TypeNotifications.Comment
    );
  }

  // لما حد يعمل Mention
  static async mentioned(userId: number, mentionerName: string) {
    return await addNotification(
      userId,
      `${mentionerName} mentioned you 🔔`,
      TypeNotifications.Mention
    );
  }

  // لما يوزر ينضم Community
  static async joinedCommunity(userId: number, communityName: string) {
    return await addNotification(
      userId,
      `You joined the community ${communityName} 🎉`,
      TypeNotifications.JoinCommunity
    );
  }

  // لما Request ينترفض من Community
  static async rejectedCommunity(userId: number, communityName: string) {
    return await addNotification(
      userId,
      `Your request to join ${communityName} was rejected ❌`,
      TypeNotifications.RejectCommunity
    );
  }

  // لما يتعمله Admin
  static async promotedToAdmin(userId: number, communityName: string) {
    return await addNotification(
      userId,
      `You are now an admin in ${communityName} 👑`,
      TypeNotifications.YourAdmin
    );
  }

  static async updatedAdminPermissions(userId: number, communityName: string) {
    return await addNotification(
      userId,
      `Your admin permissions in ${communityName} have been updated 🔧`,
      TypeNotifications.UpdateAdmin
    );
  }

  static async demotedFromAdmin(userId: number, communityName: string) {
    return await addNotification(
      userId,
      `You are no longer an admin in ${communityName} ⚠️`,
      TypeNotifications.RemoveAdmin
    );
  }
}
