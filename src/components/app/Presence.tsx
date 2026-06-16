"use client";

import { useEffect } from "react";

/** Heartbeat: marks the user "online" by updating last_seen every minute. */
export default function Presence() {
  useEffect(() => {
    const ping = () => {
      fetch("/api/presence", { method: "POST" }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
