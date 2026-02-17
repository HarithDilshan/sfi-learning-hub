"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
} from "@/lib/notifications";

export type NotifStatus = "unsupported" | "default" | "granted" | "denied" | "loading";

export function useNotifications() {
  const [status, setStatus] = useState<NotifStatus>("loading");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    const perm = getPermissionState();
    setStatus(perm as NotifStatus);

    isSubscribed().then(setSubscribed);
  }, []);

  const enable = useCallback(async () => {
    setStatus("loading");
    const sub = await subscribeToPush();
    if (sub) {
      setStatus("granted");
      setSubscribed(true);
    } else {
      setStatus(getPermissionState() as NotifStatus);
      setSubscribed(false);
    }
  }, []);

  const disable = useCallback(async () => {
    await unsubscribeFromPush();
    setSubscribed(false);
    setStatus("default");
  }, []);

  return { status, subscribed, enable, disable };
}