import "server-only";
import { createCallerFactory } from "../server/trpc";
import { createTRPCContext } from "../server/context";
import { appRouter } from "../server/router";
import { makeQueryClient } from "./query-client";

export const createCaller = createCallerFactory(appRouter);

export async function getServerTRPC() {
  const ctx = await createTRPCContext({ req: undefined });
  return createCaller(ctx);
}
