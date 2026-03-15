"use client";

import { useEffect, useState } from "react";
import { useAbly } from "./useAbly";

export interface PresenceMember {
  clientId: string;
  data: unknown;
  timestamp: number;
}

export function usePresence(channelName: string | null) {
  const { client, connected } = useAbly();
  const [members, setMembers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    if (!client || !channelName || !connected) return;

    const channel = client.channels.get(channelName);

    const updateMembers = async () => {
      try {
        const presenceSet = await channel.presence.get();
        setMembers(
          presenceSet.map((p) => ({
            clientId: p.clientId ?? "",
            data: p.data,
            timestamp: p.timestamp ?? Date.now(),
          }))
        );
      } catch (err) {
        console.error("Presence error:", err);
      }
    };

    channel.presence.subscribe("enter", updateMembers);
    channel.presence.subscribe("leave", updateMembers);
    channel.presence.subscribe("update", updateMembers);

    // Enter presence
    channel.presence.enter({ online: true });
    updateMembers();

    return () => {
      channel.presence.leave();
      channel.presence.unsubscribe();
    };
  }, [client, channelName, connected]);

  const isOnline = (clientId: string) =>
    members.some((m) => m.clientId === clientId);

  return { members, isOnline };
}
