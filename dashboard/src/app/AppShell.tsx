import { Activity, Gauge, LayoutDashboard, ShieldCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  {
    to: "/overview",
    label: "Overview",
    helper: "System health",
    icon: LayoutDashboard,
  },
  {
    to: "/admin-actions",
    label: "Admin Actions",
    helper: "Register to revoke",
    icon: ShieldCheck,
  },
  {
    to: "/on-chain-monitor",
    label: "On-Chain Monitor",
    helper: "Evidence feeds",
    icon: Activity,
  },
  {
    to: "/benchmarks",
    label: "Benchmarks",
    helper: "Readiness scope",
    icon: Gauge,
  },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>EVM-Native ABAC</span>
          <strong>IoT Identity Console</strong>
          <p>Admin and observer interface for blockchain-based smart-home device identity.</p>
        </div>
        <nav className="nav-list" aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
              >
                <Icon size={18} aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.helper}</small>
                </span>
              </NavLink>
            );
          })}
        </nav>
        <div className="boundary-note">
          <span>Authority boundary</span>
          <p>Interface to middleware only. Contracts remain the final authorization authority.</p>
        </div>
      </aside>
      <main className="workspace">
        <Outlet />
      </main>
    </div>
  );
}
