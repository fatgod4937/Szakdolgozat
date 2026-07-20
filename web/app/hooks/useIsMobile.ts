"use client";

import { useEffect, useState } from "react";

const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS | number;

function getBreakpointValue(breakpoint: Breakpoint) {
  return typeof breakpoint === "number" ? breakpoint : BREAKPOINTS[breakpoint];
}

export default function useIsMobile(breakpoint: Breakpoint = "md") {
  const breakpointValue = getBreakpointValue(breakpoint);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.innerWidth < breakpointValue;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpointValue);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [breakpointValue]);

  return isMobile;
}
