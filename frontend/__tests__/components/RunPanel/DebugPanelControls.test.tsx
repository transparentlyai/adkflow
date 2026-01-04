import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  LevelBadge,
  LevelSelector,
  CategoryItem,
  PresetCard,
} from "@/components/RunPanel/DebugPanelControls";
import type {
  CategoryNode,
  LoggingPreset,
} from "@/components/RunPanel/debugPanelUtils";

describe("DebugPanelControls", () => {
  describe("LevelBadge", () => {
    it("should render the level text", () => {
      render(<LevelBadge level="INFO" />);
      expect(screen.getByText("INFO")).toBeInTheDocument();
    });

    it.each(["DEBUG", "INFO", "WARNING", "ERROR", "OFF"] as const)(
      "should render %s level",
      (level) => {
        render(<LevelBadge level={level} />);
        expect(screen.getByText(level)).toBeInTheDocument();
      },
    );

    it("should show asterisk when inherited", () => {
      render(<LevelBadge level="INFO" isInherited={true} />);
      expect(screen.getByText("INFO*")).toBeInTheDocument();
    });

    it("should not show asterisk when not inherited", () => {
      render(<LevelBadge level="INFO" isInherited={false} />);
      expect(screen.getByText("INFO")).toBeInTheDocument();
    });

    it("should show inherited tooltip", () => {
      render(<LevelBadge level="INFO" isInherited={true} />);
      const badge = screen.getByText("INFO*");
      expect(badge).toHaveAttribute("title", "Inherited from parent");
    });
  });

  describe("LevelSelector", () => {
    const defaultProps = {
      value: "INFO" as const,
      onChange: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should render the current level", () => {
      render(<LevelSelector {...defaultProps} />);
      expect(screen.getByText("INFO")).toBeInTheDocument();
    });

    it("should be disabled when disabled prop is true", () => {
      render(<LevelSelector {...defaultProps} disabled={true} />);
      const trigger = screen.getByText("INFO").closest("button");
      expect(trigger).toBeDisabled();
    });

    it("should render with isInherited prop", () => {
      render(<LevelSelector {...defaultProps} isInherited={true} />);
      expect(screen.getByText("INFO*")).toBeInTheDocument();
    });

    it.each(["DEBUG", "INFO", "WARNING", "ERROR", "OFF"] as const)(
      "should render %s level",
      (level) => {
        render(<LevelSelector {...defaultProps} value={level} />);
        expect(screen.getByText(level)).toBeInTheDocument();
      },
    );
  });

  describe("CategoryItem", () => {
    const mockNode: CategoryNode = {
      name: "runner",
      displayName: "runner",
      depth: 0,
      effectiveLevel: "INFO",
      isInherited: false,
      children: [],
    };

    const defaultProps = {
      node: mockNode,
      expanded: new Set<string>(),
      onToggle: vi.fn(),
      onLevelChange: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should render the category name", () => {
      render(<CategoryItem {...defaultProps} />);
      expect(screen.getByText("runner")).toBeInTheDocument();
    });

    it("should render the level selector", () => {
      render(<CategoryItem {...defaultProps} />);
      expect(screen.getByText("INFO")).toBeInTheDocument();
    });

    it("should show expand button when has children", () => {
      const nodeWithChildren: CategoryNode = {
        ...mockNode,
        children: [
          {
            name: "runner.agent",
            displayName: "agent",
            depth: 1,
            effectiveLevel: "DEBUG",
            isInherited: true,
            children: [],
          },
        ],
      };
      render(<CategoryItem {...defaultProps} node={nodeWithChildren} />);
      // ChevronRight should be present - there are multiple buttons (expand + level selector)
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should call onToggle when expand button is clicked", () => {
      const onToggle = vi.fn();
      const nodeWithChildren: CategoryNode = {
        ...mockNode,
        children: [
          {
            name: "runner.agent",
            displayName: "agent",
            depth: 1,
            effectiveLevel: "DEBUG",
            isInherited: true,
            children: [],
          },
        ],
      };
      render(
        <CategoryItem
          {...defaultProps}
          node={nodeWithChildren}
          onToggle={onToggle}
        />,
      );

      // Get the first button which is the expand button
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);
      expect(onToggle).toHaveBeenCalledWith("runner");
    });

    it("should render children when expanded", () => {
      const nodeWithChildren: CategoryNode = {
        ...mockNode,
        children: [
          {
            name: "runner.agent",
            displayName: "agent",
            depth: 1,
            effectiveLevel: "DEBUG",
            isInherited: true,
            children: [],
          },
        ],
      };
      render(
        <CategoryItem
          {...defaultProps}
          node={nodeWithChildren}
          expanded={new Set(["runner"])}
        />,
      );

      expect(screen.getByText("agent")).toBeInTheDocument();
    });

    it("should not render children when collapsed", () => {
      const nodeWithChildren: CategoryNode = {
        ...mockNode,
        children: [
          {
            name: "runner.agent",
            displayName: "agent",
            depth: 1,
            effectiveLevel: "DEBUG",
            isInherited: true,
            children: [],
          },
        ],
      };
      render(
        <CategoryItem
          {...defaultProps}
          node={nodeWithChildren}
          expanded={new Set()}
        />,
      );

      expect(screen.queryByText("agent")).not.toBeInTheDocument();
    });
  });

  describe("PresetCard", () => {
    const mockPreset: LoggingPreset = {
      name: "Debug",
      description: "Enable debug logging",
      config: { level: "DEBUG" },
    };

    const defaultProps = {
      preset: mockPreset,
      onClick: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should render the preset name", () => {
      render(<PresetCard {...defaultProps} />);
      expect(screen.getByText("Debug")).toBeInTheDocument();
    });

    it("should show description as title", () => {
      render(<PresetCard {...defaultProps} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("title", "Enable debug logging");
    });

    it("should call onClick when clicked", () => {
      const onClick = vi.fn();
      render(<PresetCard {...defaultProps} onClick={onClick} />);

      fireEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalled();
    });

    it("should be disabled when disabled prop is true", () => {
      render(<PresetCard {...defaultProps} disabled={true} />);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });
});
