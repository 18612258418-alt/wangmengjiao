import { useContext } from "react";
import { PenContext } from "./PenContextProvider";

export function usePenContext() {
  const ctx = useContext(PenContext);
  if (!ctx) {
    throw new Error("usePenContext must be used within PenContextProvider");
  }
  return ctx;
}

/** Safe variant for optional integration outside provider (should not happen in app). */
export function usePenContextOptional() {
  return useContext(PenContext);
}
