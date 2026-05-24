import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    allowedHosts: ["lawn-frame.server.kitze.io", "frame.server.kitze.io"],
  },
  preview: {
    allowedHosts: ["lawn-frame.server.kitze.io", "frame.server.kitze.io"],
  },
  plugins: [
    tsconfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      srcDirectory: "app",
      spa: {
        enabled: true,
        maskPath: "/mono",
        prerender: {
          outputPath: "/_shell",
          crawlLinks: false,
        },
      },
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
      },
      pages: [
        { path: "/" },
        { path: "/compare/frameio" },
        { path: "/compare/wipster" },
        { path: "/for/video-editors" },
        { path: "/for/agencies" },
        { path: "/pricing" },
      ],
    }),
    viteReact(),
  ],
});
