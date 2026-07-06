import type {
  ApiError,
  EventsResponse,
  GrantInput,
  GrantResponse,
  ObserverDeviceResponse,
  RegisterInput,
  RegisterResponse,
  RequestsResponse,
  RevokeInput,
  RevokeResponse,
  StatusResponse,
  TransactionsResponse,
  VerifyAccessInput,
  VerifyAccessResponse,
} from "./types";

type MiddlewarePayload = {
  ok?: boolean;
  error?: string;
  requestId?: string;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveBaseUrl() {
  const configured = import.meta.env.VITE_MIDDLEWARE_BASE_URL as string | undefined;
  return configured ? trimTrailingSlash(configured) : "";
}

async function parsePayload(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as MiddlewarePayload;
  } catch {
    return { error: text };
  }
}

function defaultErrorMessage(statusCode: number) {
  if (statusCode === 0) {
    return "Unable to reach the middleware service.";
  }

  if (statusCode === 502 || statusCode === 503) {
    return "The dashboard cannot currently reach the middleware through the configured proxy.";
  }

  if (statusCode === 404) {
    return "The requested middleware route is unavailable.";
  }

  return "Middleware request failed.";
}

export class MiddlewareClient {
  private readonly baseUrl = resolveBaseUrl();

  getStatus() {
    return this.request<StatusResponse>("/status");
  }

  getRequests() {
    return this.request<RequestsResponse>("/telemetry/requests");
  }

  getTransactions() {
    return this.request<TransactionsResponse>("/telemetry/transactions");
  }

  getEvents() {
    return this.request<EventsResponse>("/events");
  }

  async getObserverDevice(principal: string) {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/observer/device/${encodeURIComponent(principal)}`);
    } catch {
      throw this.toError({}, 0);
    }

    const payload = (await parsePayload(response)) as ObserverDeviceResponse & MiddlewarePayload;

    if (response.status === 404 && payload.registered === false) {
      return payload;
    }

    if (!response.ok || payload.ok === false) {
      throw this.toError(payload, response.status);
    }

    return payload;
  }

  registerDevice(input: RegisterInput) {
    return this.request<RegisterResponse>("/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  grantAttributes(input: GrantInput) {
    return this.request<GrantResponse>("/grant", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  verifyAccess(input: VerifyAccessInput) {
    return this.request<VerifyAccessResponse>("/verifyAccess", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  revokeDevice(input: RevokeInput) {
    return this.request<RevokeResponse>("/revoke", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  private async request<T>(path: string, init?: RequestInit) {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      });
    } catch {
      throw this.toError({}, 0);
    }

    const payload = (await parsePayload(response)) as T & MiddlewarePayload;

    if (!response.ok || payload.ok === false) {
      throw this.toError(payload, response.status);
    }

    return payload;
  }

  private toError(payload: MiddlewarePayload, statusCode: number): ApiError {
    const fallback = defaultErrorMessage(statusCode);
    const message =
      statusCode === 502 || statusCode === 503
        ? fallback
        : payload.error?.trim() || fallback;

    return {
      message,
      requestId: payload.requestId,
      statusCode,
    };
  }
}

export const middlewareClient = new MiddlewareClient();
