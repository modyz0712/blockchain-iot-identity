import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { AdminActionsPage } from "../pages/AdminActionsPage";
import { BenchmarksPage } from "../pages/BenchmarksPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { OnChainMonitorPage } from "../pages/OnChainMonitorPage";
import { OverviewPage } from "../pages/OverviewPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", element: <OverviewPage /> },
      { path: "admin-actions", element: <AdminActionsPage /> },
      { path: "on-chain-monitor", element: <OnChainMonitorPage /> },
      { path: "benchmarks", element: <BenchmarksPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
