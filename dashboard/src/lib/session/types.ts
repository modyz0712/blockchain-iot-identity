export type SessionAction = {
  id: string;
  action: string;
  route: string;
  principal: string;
  requestId: string;
  txHash: string;
  blockNumber: string;
  gasUsed: string;
  status: string;
  timestamp: string;
};

export type SessionHistoryValue = {
  entries: SessionAction[];
  record: (entry: Omit<SessionAction, "id" | "timestamp">) => void;
  clear: () => void;
};
