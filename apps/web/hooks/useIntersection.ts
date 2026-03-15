"use client";

import { useEffect, type RefObject } from "react";

export function useIntersection(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  options?: IntersectionObserverInit
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callback();
        }
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, callback, options]);
}
