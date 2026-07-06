import { useContext } from "react";
import { SessionHistoryContext } from "./context";

export function useSessionHistory() {
  const value = useContext(SessionHistoryContext);

  if (!value) {
    throw new Error("useSessionHistory must be used within SessionHistoryProvider");
  }

  return value;
}
