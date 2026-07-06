const MAX_HISTORY_ITEMS = 50;

const requestHistory = [];
const transactionHistory = [];
const eventHistory = [];

function pushRecent(history, payload) {
  history.unshift(payload);
  if (history.length > MAX_HISTORY_ITEMS) {
    history.length = MAX_HISTORY_ITEMS;
  }
}

function toSerializable(payload) {
  return JSON.parse(JSON.stringify(payload));
}

function moveTransactionToFront(index) {
  if (index <= 0) {
    return;
  }

  const [entry] = transactionHistory.splice(index, 1);
  transactionHistory.unshift(entry);
}

export function logClientRequest(payload) {
  const entry = toSerializable(payload);
  pushRecent(requestHistory, entry);
  console.log("Client request received", JSON.stringify(entry));
}

export function logContractSubmission(payload) {
  const entry = {
    ...toSerializable(payload),
    submittedAt: new Date().toISOString(),
    receipt: null,
    events: [],
  };

  pushRecent(transactionHistory, entry);
  console.log("Contract call submitted successfully", JSON.stringify(entry));
}

export function logReceipt(payload) {
  const entry = toSerializable(payload);
  const transactionIndex = transactionHistory.findIndex((item) => item.txHash === entry.txHash);

  if (transactionIndex >= 0) {
    transactionHistory[transactionIndex] = {
      ...transactionHistory[transactionIndex],
      receipt: {
        requestId: entry.requestId,
        method: entry.method,
        blockNumber: entry.blockNumber,
        gasUsed: entry.gasUsed,
        status: entry.status,
        receivedAt: new Date().toISOString(),
      },
      events: entry.events ?? [],
    };
    moveTransactionToFront(transactionIndex);
  } else {
    pushRecent(transactionHistory, {
      requestId: entry.requestId,
      method: entry.method,
      txHash: entry.txHash,
      submittedAt: null,
      receipt: {
        requestId: entry.requestId,
        method: entry.method,
        blockNumber: entry.blockNumber,
        gasUsed: entry.gasUsed,
        status: entry.status,
        receivedAt: new Date().toISOString(),
      },
      events: entry.events ?? [],
    });
  }

  if (Array.isArray(entry.events)) {
    for (const event of entry.events) {
      pushRecent(eventHistory, event);
    }
  }

  console.log("Contract receipt received", JSON.stringify(entry));
}

export function getRecentRequests() {
  return requestHistory.map((item) => ({ ...item }));
}

export function getRecentTransactions() {
  return transactionHistory.map((item) => ({
    ...item,
    receipt: item.receipt ? { ...item.receipt } : null,
    events: item.events.map((event) => ({ ...event })),
  }));
}

export function getRecentEvents() {
  return eventHistory.map((item) => ({ ...item }));
}

export function buildRequestLogPayload(req, principal) {
  return {
    requestId: req.requestId,
    timestamp: req.requestTimestamp,
    route: `${req.method} ${req.path}`,
    principal: principal ?? null,
    signer: req.body?.signer ?? null,
  };
}
