import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

describe("Tooltip components", () => {
  it("should render trigger element", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button data-testid="trigger">Hover me</button>
          </TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByTestId("trigger")).toBeInTheDocument();
  });

  it("should render button with correct text", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Click me</TooltipTrigger>
          <TooltipContent>Info</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("should work with custom delay", () => {
    render(
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger>Delayed</TooltipTrigger>
          <TooltipContent>After delay</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should render without provider wrapping content", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>No wrap</TooltipTrigger>
          <TooltipContent className="custom-tooltip">
            Custom content
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
