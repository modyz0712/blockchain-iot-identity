import { createContext } from "react";
import type { SessionHistoryValue } from "./types";

export const SessionHistoryContext = createContext<SessionHistoryValue | null>(null);
