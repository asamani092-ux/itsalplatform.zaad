import type { Config } from "tailwindcss";
import zaadPreset from "@zaad/design-system/tailwind.preset";

const config: Config = {
  presets: [zaadPreset],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
};

export default config;
