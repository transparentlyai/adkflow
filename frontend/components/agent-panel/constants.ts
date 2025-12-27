import type { PlannerConfig } from "@/lib/types";

export const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
];

export const PLANNER_TYPES: { value: PlannerConfig["type"]; label: string }[] =
  [
    { value: "none", label: "None" },
    { value: "builtin", label: "Built-in (Thinking)" },
    { value: "react", label: "ReAct" },
  ];
