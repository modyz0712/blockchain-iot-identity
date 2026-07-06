import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const middlewareTarget = process.env.VITE_MIDDLEWARE_PROXY_TARGET ?? "http://127.0.0.1:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/status": middlewareTarget,
      "/observer": middlewareTarget,
      "/telemetry": middlewareTarget,
      "/events": middlewareTarget,
      "/register": middlewareTarget,
      "/grant": middlewareTarget,
      "/verifyAccess": middlewareTarget,
      "/revoke": middlewareTarget,
    },
  },
});
