import type { Config } from "tailwindcss";

/**
 * AgentPrism color tokens for Tailwind
 * These map to CSS variables set by the theme system
 */
const agentPrismColors = {
  // General purpose
  "agentprism-background": "var(--agentprism-background)",
  "agentprism-foreground": "var(--agentprism-foreground)",
  "agentprism-primary": "var(--agentprism-primary)",
  "agentprism-primary-foreground": "var(--agentprism-primary-foreground)",
  "agentprism-secondary": "var(--agentprism-secondary)",
  "agentprism-secondary-foreground": "var(--agentprism-secondary-foreground)",
  "agentprism-muted": "var(--agentprism-muted)",
  "agentprism-muted-foreground": "var(--agentprism-muted-foreground)",
  "agentprism-accent": "var(--agentprism-accent)",
  "agentprism-accent-foreground": "var(--agentprism-accent-foreground)",
  // Brand
  "agentprism-brand": "var(--agentprism-brand)",
  "agentprism-brand-foreground": "var(--agentprism-brand-foreground)",
  "agentprism-brand-secondary": "var(--agentprism-brand-secondary)",
  "agentprism-brand-secondary-foreground":
    "var(--agentprism-brand-secondary-foreground)",
  // Borders
  "agentprism-border": "var(--agentprism-border)",
  "agentprism-border-subtle": "var(--agentprism-border-subtle)",
  "agentprism-border-strong": "var(--agentprism-border-strong)",
  "agentprism-border-inverse": "var(--agentprism-border-inverse)",
  // Status
  "agentprism-success": "var(--agentprism-success)",
  "agentprism-success-muted": "var(--agentprism-success-muted)",
  "agentprism-success-muted-foreground":
    "var(--agentprism-success-muted-foreground)",
  "agentprism-error": "var(--agentprism-error)",
  "agentprism-error-muted": "var(--agentprism-error-muted)",
  "agentprism-error-muted-foreground":
    "var(--agentprism-error-muted-foreground)",
  "agentprism-warning": "var(--agentprism-warning)",
  "agentprism-warning-muted": "var(--agentprism-warning-muted)",
  "agentprism-warning-muted-foreground":
    "var(--agentprism-warning-muted-foreground)",
  "agentprism-pending": "var(--agentprism-pending)",
  "agentprism-pending-muted": "var(--agentprism-pending-muted)",
  "agentprism-pending-muted-foreground":
    "var(--agentprism-pending-muted-foreground)",
  // Code syntax
  "agentprism-code-string": "var(--agentprism-code-string)",
  "agentprism-code-number": "var(--agentprism-code-number)",
  "agentprism-code-key": "var(--agentprism-code-key)",
  "agentprism-code-base": "var(--agentprism-code-base)",
  // Badge default
  "agentprism-badge-default": "var(--agentprism-badge-default)",
  "agentprism-badge-default-foreground":
    "var(--agentprism-badge-default-foreground)",
  // LLM trace type
  "agentprism-avatar-llm": "var(--agentprism-avatar-llm)",
  "agentprism-badge-llm": "var(--agentprism-badge-llm)",
  "agentprism-badge-llm-foreground": "var(--agentprism-badge-llm-foreground)",
  "agentprism-timeline-llm": "var(--agentprism-timeline-llm)",
  // Agent trace type
  "agentprism-avatar-agent": "var(--agentprism-avatar-agent)",
  "agentprism-badge-agent": "var(--agentprism-badge-agent)",
  "agentprism-badge-agent-foreground":
    "var(--agentprism-badge-agent-foreground)",
  "agentprism-timeline-agent": "var(--agentprism-timeline-agent)",
  // Tool trace type
  "agentprism-avatar-tool": "var(--agentprism-avatar-tool)",
  "agentprism-badge-tool": "var(--agentprism-badge-tool)",
  "agentprism-badge-tool-foreground": "var(--agentprism-badge-tool-foreground)",
  "agentprism-timeline-tool": "var(--agentprism-timeline-tool)",
  // Chain trace type
  "agentprism-avatar-chain": "var(--agentprism-avatar-chain)",
  "agentprism-badge-chain": "var(--agentprism-badge-chain)",
  "agentprism-badge-chain-foreground":
    "var(--agentprism-badge-chain-foreground)",
  "agentprism-timeline-chain": "var(--agentprism-timeline-chain)",
  // Retrieval trace type
  "agentprism-avatar-retrieval": "var(--agentprism-avatar-retrieval)",
  "agentprism-badge-retrieval": "var(--agentprism-badge-retrieval)",
  "agentprism-badge-retrieval-foreground":
    "var(--agentprism-badge-retrieval-foreground)",
  "agentprism-timeline-retrieval": "var(--agentprism-timeline-retrieval)",
  // Embedding trace type
  "agentprism-avatar-embedding": "var(--agentprism-avatar-embedding)",
  "agentprism-badge-embedding": "var(--agentprism-badge-embedding)",
  "agentprism-badge-embedding-foreground":
    "var(--agentprism-badge-embedding-foreground)",
  "agentprism-timeline-embedding": "var(--agentprism-timeline-embedding)",
  // Guardrail trace type
  "agentprism-avatar-guardrail": "var(--agentprism-avatar-guardrail)",
  "agentprism-badge-guardrail": "var(--agentprism-badge-guardrail)",
  "agentprism-badge-guardrail-foreground":
    "var(--agentprism-badge-guardrail-foreground)",
  "agentprism-timeline-guardrail": "var(--agentprism-timeline-guardrail)",
  // Create agent trace type
  "agentprism-avatar-create-agent": "var(--agentprism-avatar-create-agent)",
  "agentprism-badge-create-agent": "var(--agentprism-badge-create-agent)",
  "agentprism-badge-create-agent-foreground":
    "var(--agentprism-badge-create-agent-foreground)",
  "agentprism-timeline-create-agent": "var(--agentprism-timeline-create-agent)",
  // Span trace type
  "agentprism-avatar-span": "var(--agentprism-avatar-span)",
  "agentprism-badge-span": "var(--agentprism-badge-span)",
  "agentprism-badge-span-foreground": "var(--agentprism-badge-span-foreground)",
  "agentprism-timeline-span": "var(--agentprism-timeline-span)",
  // Event trace type
  "agentprism-avatar-event": "var(--agentprism-avatar-event)",
  "agentprism-badge-event": "var(--agentprism-badge-event)",
  "agentprism-badge-event-foreground":
    "var(--agentprism-badge-event-foreground)",
  "agentprism-timeline-event": "var(--agentprism-timeline-event)",
  // Unknown trace type
  "agentprism-avatar-unknown": "var(--agentprism-avatar-unknown)",
  "agentprism-badge-unknown": "var(--agentprism-badge-unknown)",
  "agentprism-badge-unknown-foreground":
    "var(--agentprism-badge-unknown-foreground)",
  "agentprism-timeline-unknown": "var(--agentprism-timeline-unknown)",
};

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        // AgentPrism colors for trace visualization
        ...agentPrismColors,
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
