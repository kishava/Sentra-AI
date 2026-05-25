"use client";

import { useEffect, useState } from "react";

export function useTypewriter(text: string, active = true) {
  const [displayed, setDisplayed] = useState(active ? "" : text);

  useEffect(() => {
    if (!active) return;

    let index = 0;
    const reset = window.setTimeout(() => setDisplayed(""), 0);
    const interval = window.setInterval(() => {
      index += 4;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(interval);
      }
    }, 14);

    return () => {
      window.clearTimeout(reset);
      window.clearInterval(interval);
    };
  }, [active, text]);

  return active ? displayed : text;
}
