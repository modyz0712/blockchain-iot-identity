import { Link, useRouteError } from "react-router-dom";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "The dashboard route failed to render.";

  return (
    <main className="route-error">
      <p className="eyebrow">Route Error</p>
      <h1>Dashboard view unavailable</h1>
      <p>{message}</p>
      <Link className="button button-secondary" to="/overview">
        Return to overview
      </Link>
    </main>
  );
}
