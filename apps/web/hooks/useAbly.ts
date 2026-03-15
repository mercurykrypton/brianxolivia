"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Ably from "ably";
import { trpc } from "@/lib/trpc/provider";

let ablyClient: Ably.Realtime | null = null;

export function useAbly() {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<Ably.Realtime | null>(null);

  const getToken = trpc.messages.getAblyToken.useMutation();

  useEffect(() => {
    if (ablyClient) {
      clientRef.current = ablyClient;
      setConnected(ablyClient.connection.state === "connected");
      return;
    }

    const client = new Ably.Realtime({
      authCallback: async (_, callback) => {
        try {
          const tokenRequest = await getToken.mutateAsync();
          callback(null, tokenRequest as Ably.TokenRequest);
        } catch (err) {
          callback(err as Error, null);
        }
      },
    });

    client.connection.on("connected", () => setConnected(true));
    client.connection.on("disconnected", () => setConnected(false));
    client.connection.on("failed", (err) => setError(new Error(err?.reason?.message)));

    ablyClient = client;
    clientRef.current = client;

    return () => {
      // Don't close the global client
    };
  }, []);

  const subscribe = useCallback(
    (channelName: string, eventName: string, callback: (message: Ably.Message) => void) => {
      if (!clientRef.current) return () => {};

      const channel = clientRef.current.channels.get(channelName);
      channel.subscribe(eventName, callback);

      return () => {
        channel.unsubscribe(eventName, callback);
      };
    },
    []
  );

  const publish = useCallback(
    async (channelName: string, eventName: string, data: unknown) => {
      if (!clientRef.current) return;
      const channel = clientRef.current.channels.get(channelName);
      await channel.publish(eventName, data);
    },
    []
  );

  const publishPresence = useCallback(
    async (channelName: string, data: unknown) => {
      if (!clientRef.current) return;
      const channel = clientRef.current.channels.get(channelName);
      await channel.presence.update(data);
    },
    []
  );

  return {
    client: clientRef.current,
    connected,
    error,
    subscribe,
    publish,
    publishPresence,
  };
}

export function useAblyChannel(
  channelName: string | null,
  eventName: string,
  callback: (data: unknown) => void
) {
  const { subscribe } = useAbly();

  useEffect(() => {
    if (!channelName) return;
    const unsubscribe = subscribe(channelName, eventName, (msg) => {
      callback(msg.data);
    });
    return unsubscribe;
  }, [channelName, eventName, subscribe, callback]);
}
