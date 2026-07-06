export type ApiError = {
  message: string;
  statusCode: number;
  requestId?: string;
};

export type StatusResponse = {
  middlewareRunning: boolean;
  evmReachable: boolean;
  rpcUrl: string;
  chainId: string | null;
  latestBlock: string | null;
  revocationMode: string | null;
  contractAddresses: {
    registry: string | null;
    revocation: string | null;
    accessControl: string | null;
  };
};

export type ObserverDeviceRegistered = {
  ok: true;
  principal: string;
  registered: true;
  attributes: string;
  index: string;
  revocationMode: string;
  revoked: boolean;
};

export type ObserverDeviceMissing = {
  ok: false;
  principal: string;
  registered: false;
  error: string;
  revocationMode: string;
};

export type ObserverDeviceResponse = ObserverDeviceRegistered | ObserverDeviceMissing;

export type RequestLog = {
  requestId: string;
  timestamp: string;
  route: string;
  principal: string | null;
  signer: string | null;
};

export type ContractEvent = {
  contract: string;
  event: string;
  txHash: string;
  principal?: string;
  requester?: string;
  target?: string;
  attributes?: string;
  oldAttributes?: string;
  newAttributes?: string;
  index?: string;
  mode?: string;
  status?: boolean;
  requiredMask?: string;
  granted?: boolean;
  revoked?: boolean;
  requesterAttributes?: string;
  requesterIndex?: string;
};

export type TransactionReceipt = {
  requestId: string;
  method: string;
  blockNumber: string;
  gasUsed: string;
  status: boolean;
  receivedAt: string;
};

export type TransactionLog = {
  requestId: string;
  method: string;
  txHash: string;
  submittedAt: string | null;
  receipt: TransactionReceipt | null;
  events: ContractEvent[];
};

export type RequestsResponse = {
  ok: true;
  requests: RequestLog[];
};

export type TransactionsResponse = {
  ok: true;
  transactions: TransactionLog[];
};

export type EventsResponse = {
  ok: true;
  events: ContractEvent[];
};

export type RegisterInput = {
  principal: string;
  attributes: string;
};

export type RegisterResponse = {
  ok: true;
  requestId: string;
  route: "/register";
  principal: string;
  attributes: string;
  txHash: string;
  receiptStatus: boolean;
  blockNumber: string;
  gasUsed: string;
};

export type GrantInput = {
  principal: string;
  attributes: string;
};

export type GrantResponse = {
  ok: true;
  requestId: string;
  route: "/grant";
  principal: string;
  attributes: string;
  txHash: string;
  receiptStatus: boolean;
  blockNumber: string;
  gasUsed: string;
};

export type VerifyAccessInput = {
  principal: string;
  target?: string;
  requiredMask: string;
};

export type VerifyAccessResponse = {
  ok: true;
  requestId: string;
  route: "/verifyAccess";
  principal: string;
  target: string;
  requiredMask: string;
  granted: boolean | null;
  revoked: boolean | null;
  txHash: string;
  receiptStatus: boolean;
  blockNumber: string;
  gasUsed: string;
};

export type RevokeInput = {
  principal: string;
  mode: "A" | "B" | 0 | 1;
  status: boolean;
};

export type RevokeResponse = {
  ok: true;
  requestId: string;
  route: "/revoke";
  principal: string;
  mode: string;
  status: boolean;
  indexUsed: string | null;
  setModeTxHash: string;
  revokeTxHash: string;
  receiptStatus: boolean;
  blockNumber: string;
  gasUsed: string;
};

export type AdminResponse = RegisterResponse | GrantResponse | VerifyAccessResponse | RevokeResponse;
