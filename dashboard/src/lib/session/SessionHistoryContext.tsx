import { useState, type PropsWithChildren } from "react";
import { SessionHistoryContext } from "./context";
import type { SessionAction } from "./types";

export function SessionHistoryProvider({ children }: PropsWithChildren) {
  const [entries, setEntries] = useState<SessionAction[]>([]);

  function record(entry: Omit<SessionAction, "id" | "timestamp">) {
    const timestamp = new Date().toISOString();
    setEntries((current) => [
      {
        ...entry,
        id: `${entry.requestId}-${entry.action}-${timestamp}`,
        timestamp,
      },
      ...current,
    ].slice(0, 10));
  }

  function clear() {
    setEntries([]);
  }

  return (
    <SessionHistoryContext.Provider value={{ entries, record, clear }}>
      {children}
    </SessionHistoryContext.Provider>
  );
}
