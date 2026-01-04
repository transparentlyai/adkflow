import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  LogTimeRangeFilter,
  TimeRangeRow,
} from "@/components/LogExplorer/toolbar/LogTimeRangeFilter";

describe("LogTimeRangeFilter", () => {
  const defaultProps = {
    startTime: null,
    endTime: null,
    showTimeRange: false,
    stats: null,
    onTimeRangeChange: vi.fn(),
    onToggleTimeRange: vi.fn(),
  };

  describe("button rendering", () => {
    it("should render Time button", () => {
      render(<LogTimeRangeFilter {...defaultProps} />);
      expect(screen.getByText("Time")).toBeInTheDocument();
    });

    it("should show count badge when startTime is set", () => {
      render(
        <LogTimeRangeFilter
          {...defaultProps}
          startTime="2024-01-01T00:00:00Z"
        />,
      );
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("should show count badge when endTime is set", () => {
      render(
        <LogTimeRangeFilter {...defaultProps} endTime="2024-01-01T23:59:59Z" />,
      );
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("should show count of 2 when both times are set", () => {
      render(
        <LogTimeRangeFilter
          {...defaultProps}
          startTime="2024-01-01T00:00:00Z"
          endTime="2024-01-01T23:59:59Z"
        />,
      );
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should call onToggleTimeRange when button clicked", () => {
      const onToggleTimeRange = vi.fn();
      render(
        <LogTimeRangeFilter
          {...defaultProps}
          onToggleTimeRange={onToggleTimeRange}
        />,
      );
      fireEvent.click(screen.getByText("Time"));
      expect(onToggleTimeRange).toHaveBeenCalled();
    });
  });

  describe("expanded state", () => {
    it("should not show time range row when showTimeRange is false", () => {
      render(<LogTimeRangeFilter {...defaultProps} />);
      expect(screen.queryByText("From:")).not.toBeInTheDocument();
    });

    it("should show time range row when showTimeRange is true", () => {
      render(<LogTimeRangeFilter {...defaultProps} showTimeRange={true} />);
      expect(screen.getByText("From:")).toBeInTheDocument();
      expect(screen.getByText("To:")).toBeInTheDocument();
    });
  });
});

describe("TimeRangeRow", () => {
  const formatDateTimeLocal = (isoString: string | null): string => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const parseDateTimeLocal = (value: string): string | null => {
    if (!value) return null;
    try {
      return new Date(value).toISOString();
    } catch {
      return null;
    }
  };

  const defaultProps = {
    startTime: null,
    endTime: null,
    stats: null,
    onTimeRangeChange: vi.fn(),
    formatDateTimeLocal,
    parseDateTimeLocal,
  };

  describe("rendering", () => {
    it("should render From and To labels", () => {
      render(<TimeRangeRow {...defaultProps} />);
      expect(screen.getByText("From:")).toBeInTheDocument();
      expect(screen.getByText("To:")).toBeInTheDocument();
    });

    it("should render datetime inputs", () => {
      const { container } = render(<TimeRangeRow {...defaultProps} />);
      const inputs = container.querySelectorAll('input[type="datetime-local"]');
      expect(inputs.length).toBe(2);
    });
  });

  describe("clear button", () => {
    it("should not show clear button when no time filter", () => {
      render(<TimeRangeRow {...defaultProps} />);
      expect(screen.queryByText("Clear time range")).not.toBeInTheDocument();
    });

    it("should show clear button when startTime is set", () => {
      render(
        <TimeRangeRow {...defaultProps} startTime="2024-01-01T00:00:00Z" />,
      );
      expect(screen.getByText("Clear time range")).toBeInTheDocument();
    });

    it("should show clear button when endTime is set", () => {
      render(<TimeRangeRow {...defaultProps} endTime="2024-01-01T23:59:59Z" />);
      expect(screen.getByText("Clear time range")).toBeInTheDocument();
    });

    it("should call onTimeRangeChange with nulls when clear clicked", () => {
      const onTimeRangeChange = vi.fn();
      render(
        <TimeRangeRow
          {...defaultProps}
          startTime="2024-01-01T00:00:00Z"
          onTimeRangeChange={onTimeRangeChange}
        />,
      );
      fireEvent.click(screen.getByText("Clear time range"));
      expect(onTimeRangeChange).toHaveBeenCalledWith(null, null);
    });
  });

  describe("stats display", () => {
    it("should not show log range when no stats", () => {
      render(<TimeRangeRow {...defaultProps} />);
      expect(screen.queryByText(/Log range:/)).not.toBeInTheDocument();
    });

    it("should show log range when stats has timeRange", () => {
      const stats = {
        totalLines: 100,
        timeRange: {
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-31T23:59:59Z",
        },
        levels: {},
      };
      render(<TimeRangeRow {...defaultProps} stats={stats} />);
      expect(screen.getByText(/Log range:/)).toBeInTheDocument();
    });

    it("should show 'now' when timeRange.end is null", () => {
      const stats = {
        totalLines: 100,
        timeRange: {
          start: "2024-01-01T00:00:00Z",
          end: null,
        },
        levels: {},
      };
      render(<TimeRangeRow {...defaultProps} stats={stats} />);
      expect(screen.getByText(/now/)).toBeInTheDocument();
    });
  });
});
