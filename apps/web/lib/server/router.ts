import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { creatorRouter } from "./routers/creator";
import { postsRouter } from "./routers/posts";
import { subscriptionsRouter } from "./routers/subscriptions";
import { messagesRouter } from "./routers/messages";
import { tipsRouter } from "./routers/tips";
import { requestsRouter } from "./routers/requests";
import { paymentsRouter } from "./routers/payments";
import { notificationsRouter } from "./routers/notifications";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  creator: creatorRouter,
  posts: postsRouter,
  subscriptions: subscriptionsRouter,
  messages: messagesRouter,
  tips: tipsRouter,
  requests: requestsRouter,
  payments: paymentsRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
