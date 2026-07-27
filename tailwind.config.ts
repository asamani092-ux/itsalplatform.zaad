import type { Config } from "tailwindcss";
import tmkeenPreset from "./Design_system_f/uploads/design-system/tailwind.preset";

const config: Config = {
  presets: [tmkeenPreset],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
};

export default config;
