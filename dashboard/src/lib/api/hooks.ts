import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { middlewareClient } from "./client";
import type {
  ApiError,
  GrantInput,
  GrantResponse,
  RegisterInput,
  RegisterResponse,
  RevokeInput,
  RevokeResponse,
  VerifyAccessInput,
  VerifyAccessResponse,
} from "./types";

export const queryKeys = {
  status: ["status"] as const,
  requests: ["telemetry", "requests"] as const,
  transactions: ["telemetry", "transactions"] as const,
  events: ["events"] as const,
  observerDevice: (principal: string) => ["observer", "device", principal] as const,
};

function useInvalidateEvidence() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.status });
    void queryClient.invalidateQueries({ queryKey: queryKeys.requests });
    void queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    void queryClient.invalidateQueries({ queryKey: queryKeys.events });
  };
}

export function useStatusQuery() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: () => middlewareClient.getStatus(),
    refetchInterval: 5_000,
  });
}

export function useRequestsQuery() {
  return useQuery({
    queryKey: queryKeys.requests,
    queryFn: () => middlewareClient.getRequests(),
    refetchInterval: 5_000,
  });
}

export function useTransactionsQuery() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () => middlewareClient.getTransactions(),
    refetchInterval: 5_000,
  });
}

export function useEventsQuery() {
  return useQuery({
    queryKey: queryKeys.events,
    queryFn: () => middlewareClient.getEvents(),
    refetchInterval: 5_000,
  });
}

export function useObserverDeviceQuery(principal: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.observerDevice(principal),
    queryFn: () => middlewareClient.getObserverDevice(principal),
    enabled,
  });
}

export function useRegisterMutation() {
  const invalidateEvidence = useInvalidateEvidence();

  return useMutation<RegisterResponse, ApiError, RegisterInput>({
    mutationFn: (input) => middlewareClient.registerDevice(input),
    onSuccess: invalidateEvidence,
  });
}

export function useGrantMutation() {
  const invalidateEvidence = useInvalidateEvidence();

  return useMutation<GrantResponse, ApiError, GrantInput>({
    mutationFn: (input) => middlewareClient.grantAttributes(input),
    onSuccess: invalidateEvidence,
  });
}

export function useVerifyMutation() {
  const invalidateEvidence = useInvalidateEvidence();

  return useMutation<VerifyAccessResponse, ApiError, VerifyAccessInput>({
    mutationFn: (input) => middlewareClient.verifyAccess(input),
    onSuccess: invalidateEvidence,
  });
}

export function useRevokeMutation() {
  const invalidateEvidence = useInvalidateEvidence();

  return useMutation<RevokeResponse, ApiError, RevokeInput>({
    mutationFn: (input) => middlewareClient.revokeDevice(input),
    onSuccess: invalidateEvidence,
  });
}
