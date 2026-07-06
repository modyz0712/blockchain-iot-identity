type EmptyStateProps = {
  title: string;
  message: string;
};

type LoadingStateProps = {
  message: string;
};

type ErrorCalloutProps = {
  title: string;
  message: string;
  requestId?: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="loading">
      <strong>Loading</strong>
      <span>{message}</span>
    </div>
  );
}

export function ErrorCallout({ title, message, requestId }: ErrorCalloutProps) {
  return (
    <div className="alert alert-error" role="alert">
      <strong>{title}</strong>
      <span>{message}</span>
      {requestId ? <small>Request ID: {requestId}</small> : null}
    </div>
  );
}
