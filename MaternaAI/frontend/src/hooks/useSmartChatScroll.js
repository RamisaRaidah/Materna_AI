import { useCallback, useEffect, useRef, useState } from 'react';

const NEAR_BOTTOM_THRESHOLD = 80;

/**
 * Smart scroll for chat message lists:
 * - Auto-scrolls when user is near bottom
 * - Shows "New message(s)" indicator when scrolled up
 */
export function useSmartChatScroll(messages, conversationKey) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const prevLengthRef = useRef(0);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const checkNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } else {
      bottomRef.current?.scrollIntoView({ behavior });
    }
    isNearBottomRef.current = true;
    setShowNewMessages(false);
    setNewMessageCount(0);
  }, []);

  const handleScroll = useCallback(() => {
    const near = checkNearBottom();
    isNearBottomRef.current = near;
    if (near) {
      setShowNewMessages(false);
      setNewMessageCount(0);
    }
  }, [checkNearBottom]);

  useEffect(() => {
    prevLengthRef.current = 0;
    isNearBottomRef.current = true;
    setShowNewMessages(false);
    setNewMessageCount(0);
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [conversationKey, scrollToBottom]);

  useEffect(() => {
    const prevLen = prevLengthRef.current;
    const newLen = messages.length;

    if (newLen === 0) {
      prevLengthRef.current = 0;
      return;
    }

    if (prevLen === 0 && newLen > 0) {
      requestAnimationFrame(() => scrollToBottom('auto'));
    } else if (newLen > prevLen) {
      const added = newLen - prevLen;
      if (isNearBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom('smooth'));
      } else {
        setShowNewMessages(true);
        setNewMessageCount((count) => count + added);
      }
    }

    prevLengthRef.current = newLen;
  }, [messages, scrollToBottom]);

  return {
    scrollRef,
    bottomRef,
    handleScroll,
    scrollToBottom,
    showNewMessages,
    newMessageCount,
  };
}
