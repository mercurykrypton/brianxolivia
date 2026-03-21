import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@workspace/db";
import { publishMessage, publishNotification } from "../../ably";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Generate and persist an AI agent reply for a creator profile.
 * Called fire-and-forget after a fan sends a message.
 */
export async function generateAgentReply({
  conversationId,
  creatorUserId,
  creatorProfileId,
  systemPrompt,
  fanUserId,
}: {
  conversationId: string;
  creatorUserId: string;
  creatorProfileId: string;
  systemPrompt: string;
  fanUserId: string;
}) {
  // Fetch recent conversation history (last 20 messages)
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { senderId: true, body: true },
  });

  const anthropicMessages = history
    .filter((m) => m.body)
    .map((m) => ({
      role: m.senderId === creatorUserId ? ("assistant" as const) : ("user" as const),
      content: m.body!,
    }));

  // Need at least one user message and it must be the last one
  if (
    anthropicMessages.length === 0 ||
    anthropicMessages[anthropicMessages.length - 1].role !== "user"
  ) {
    return;
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages: anthropicMessages,
  });

  const replyText =
    response.content[0]?.type === "text" ? response.content[0].text : null;
  if (!replyText) return;

  // Save agent reply as a message from the creator's user account
  const agentMessage = await prisma.message.create({
    data: {
      conversationId,
      senderId: creatorUserId,
      body: replyText,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: agentMessage.createdAt },
  });

  // Push to fan via Ably
  await publishMessage(conversationId, {
    id: agentMessage.id,
    senderId: agentMessage.senderId,
    body: agentMessage.body,
    isPPV: false,
    ppvPrice: null,
    createdAt: agentMessage.createdAt,
  }).catch(console.error);

  // Notify fan
  const notification = await prisma.notification.create({
    data: {
      userId: fanUserId,
      type: "NEW_MESSAGE",
      title: "New message",
      body: replyText.slice(0, 100),
      data: { conversationId, messageId: agentMessage.id },
    },
  });

  await publishNotification(fanUserId, {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data,
  }).catch(console.error);
}
