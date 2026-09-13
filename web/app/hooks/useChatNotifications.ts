"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import useAuthSession from "./useAuthSession";
import { getAccessToken, getCurrentUserId } from "../utils/token-storage";
import { showNotification } from "../utils/notification";
import type { ChatMessageRecord } from "../utils/chat-api";

function getSocketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL;

  return apiUrl.replace(/\/api\/?$/, "");
}

export default function useChatNotifications() {
  const { isAuthenticated } = useAuthSession();
  const queryClient = useQueryClient();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const token = getAccessToken();
    const currentUserId = getCurrentUserId(token);

    if (!token || !currentUserId) {
      return;
    }

    const socket = io(`${getSocketBaseUrl()}/chat`, {
      auth: { token },
      transports: ["polling", "websocket"],
    });

    const handleMessageCreated = (message: ChatMessageRecord) => {
      if (message.senderId === currentUserId) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      void queryClient.invalidateQueries({ queryKey: ["pet-conversation"] });

      if (!location.pathname.startsWith("/chat/")) {
        showNotification("You have a new message.", "success");
      }
    };

    socket.on("message_created", handleMessageCreated);

    return () => {
      socket.off("message_created", handleMessageCreated);
      socket.disconnect();
    };
  }, [isAuthenticated, location.pathname, queryClient]);
}
