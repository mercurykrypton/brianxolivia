import Ably from "ably";

// Server-side Ably client
let ablyServer: Ably.Rest | null = null;

export function getAblyServer(): Ably.Rest {
  if (!process.env.ABLY_API_KEY) {
    throw new Error("Missing ABLY_API_KEY environment variable");
  }
  if (!ablyServer) {
    ablyServer = new Ably.Rest(process.env.ABLY_API_KEY);
  }
  return ablyServer;
}

// Channel name helpers
export const ChannelNames = {
  // Per-user notification channel
  userNotifications: (userId: string) => `notifications:${userId}`,

  // Per-conversation messaging channel
  conversation: (conversationId: string) => `conversation:${conversationId}`,

  // Creator's dashboard updates
  creatorDashboard: (creatorProfileId: string) =>
    `creator:${creatorProfileId}`,

  // Platform-wide channel (admin)
  platform: () => "platform:broadcast",
} as const;

// Event names
export const AblyEvents = {
  // Messaging
  NEW_MESSAGE: "new_message",
  MESSAGE_READ: "message_read",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  PPV_UNLOCKED: "ppv_unlocked",
  CONVERSATION_UNLOCKED: "conversation_unlocked",

  // Notifications
  NOTIFICATION: "notification",

  // Creator dashboard
  NEW_SUBSCRIBER: "new_subscriber",
  NEW_TIP: "new_tip",
  NEW_CONTENT_REQUEST: "new_content_request",

  // System
  ONLINE_STATUS: "online_status",
} as const;

// Publish a notification to a user
export async function publishNotification(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    data?: unknown;
  }
): Promise<void> {
  const ably = getAblyServer();
  const channel = ably.channels.get(ChannelNames.userNotifications(userId));
  await channel.publish(AblyEvents.NOTIFICATION, notification);
}

// Publish a new message to a conversation
export async function publishMessage(
  conversationId: string,
  message: {
    id: string;
    senderId: string;
    body?: string | null;
    isPPV: boolean;
    ppvPrice?: number | null;
    createdAt: Date;
  }
): Promise<void> {
  const ably = getAblyServer();
  const channel = ably.channels.get(ChannelNames.conversation(conversationId));
  await channel.publish(AblyEvents.NEW_MESSAGE, message);
}

// Publish read receipt
export async function publishReadReceipt(
  conversationId: string,
  messageIds: string[],
  readByUserId: string
): Promise<void> {
  const ably = getAblyServer();
  const channel = ably.channels.get(ChannelNames.conversation(conversationId));
  await channel.publish(AblyEvents.MESSAGE_READ, { messageIds, readByUserId });
}

// Publish creator dashboard update
export async function publishCreatorUpdate(
  creatorProfileId: string,
  event: string,
  data: unknown
): Promise<void> {
  const ably = getAblyServer();
  const channel = ably.channels.get(
    ChannelNames.creatorDashboard(creatorProfileId)
  );
  await channel.publish(event, data);
}

// Generate Ably token request for client auth
export async function createAblyTokenRequest(
  userId: string,
  capabilities?: Record<string, string[]>
): Promise<Ably.TokenRequest> {
  const ably = getAblyServer();

  const defaultCapabilities: Record<string, string[]> = {
    [`notifications:${userId}`]: ["subscribe", "publish"],
    [`conversation:*`]: ["subscribe", "publish", "presence"],
  };

  return ably.auth.createTokenRequest({
    clientId: userId,
    capability: JSON.stringify(capabilities ?? defaultCapabilities),
    ttl: 60 * 60 * 1000, // 1 hour
  });
}
