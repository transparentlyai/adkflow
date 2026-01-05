import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";

describe("ValidationIndicator", () => {
  describe("no issues", () => {
    it("should not render when no errors or warnings", () => {
      const { container } = render(<ValidationIndicator />);
      expect(container.firstChild).toBeNull();
    });

    it("should not render when arrays are empty", () => {
      const { container } = render(
        <ValidationIndicator errors={[]} warnings={[]} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("errors", () => {
    it("should render error icon when errors exist", () => {
      render(<ValidationIndicator errors={["Error 1"]} />);
      // The icon should be in the document (cursor-help indicates the tooltip trigger)
      expect(document.querySelector(".text-red-500")).toBeInTheDocument();
    });

    it("should show single error", () => {
      render(<ValidationIndicator errors={["Required field"]} />);
      expect(document.querySelector(".text-red-500")).toBeInTheDocument();
    });

    it("should handle duplicate name error", () => {
      render(<ValidationIndicator duplicateNameError="Name already exists" />);
      expect(document.querySelector(".text-red-500")).toBeInTheDocument();
    });

    it("should combine duplicate name with other errors", () => {
      render(
        <ValidationIndicator
          errors={["Backend error"]}
          duplicateNameError="Name already exists"
        />,
      );
      expect(document.querySelector(".text-red-500")).toBeInTheDocument();
    });
  });

  describe("warnings", () => {
    it("should render warning icon when only warnings exist", () => {
      render(<ValidationIndicator warnings={["Warning 1"]} />);
      expect(document.querySelector(".text-yellow-500")).toBeInTheDocument();
    });

    it("should show error icon when both errors and warnings", () => {
      render(<ValidationIndicator errors={["Error"]} warnings={["Warning"]} />);
      // Error takes precedence
      expect(document.querySelector(".text-red-500")).toBeInTheDocument();
    });
  });

  describe("multiple messages", () => {
    it("should handle multiple errors", () => {
      render(
        <ValidationIndicator errors={["Error 1", "Error 2", "Error 3"]} />,
      );
      expect(document.querySelector(".text-red-500")).toBeInTheDocument();
    });

    it("should handle multiple warnings", () => {
      render(<ValidationIndicator warnings={["Warning 1", "Warning 2"]} />);
      expect(document.querySelector(".text-yellow-500")).toBeInTheDocument();
    });
  });
});
