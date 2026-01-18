import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import {
  FileSyncProvider,
  useFileSync,
  type FileChangeEvent,
} from "@/contexts/FileSyncContext";

// Mock API_BASE_URL
vi.mock("@/lib/api/client", () => ({
  API_BASE_URL: "http://localhost:8000",
}));

// Test component that uses the context
function TestConsumer() {
  const {
    subscribeToFile,
    registerNodeFile,
    unregisterNodeFile,
    getNodesForFile,
    isConnected,
  } = useFileSync();

  return (
    <div>
      <span data-testid="connected">{isConnected ? "connected" : "disconnected"}</span>
      <span data-testid="hasSubscribe">{subscribeToFile ? "yes" : "no"}</span>
      <span data-testid="hasRegister">{registerNodeFile ? "yes" : "no"}</span>
      <span data-testid="hasUnregister">{unregisterNodeFile ? "yes" : "no"}</span>
      <span data-testid="hasGetNodes">{getNodesForFile ? "yes" : "no"}</span>
    </div>
  );
}

describe("FileSyncContext", () => {
  let mockEventSource: any;
  let eventListeners: Map<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventListeners = new Map();

    // Mock EventSource
    mockEventSource = {
      addEventListener: vi.fn((event: string, handler: Function) => {
        eventListeners.set(event, handler);
      }),
      removeEventListener: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onerror: null,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2,
      readyState: 1,
    };

    global.EventSource = vi.fn(() => mockEventSource) as any;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("FileSyncProvider", () => {
    it("should provide context values to children", () => {
      render(
        <FileSyncProvider projectPath="/test/project">
          <TestConsumer />
        </FileSyncProvider>,
      );

      expect(screen.getByTestId("hasSubscribe")).toHaveTextContent("yes");
      expect(screen.getByTestId("hasRegister")).toHaveTextContent("yes");
      expect(screen.getByTestId("hasUnregister")).toHaveTextContent("yes");
      expect(screen.getByTestId("hasGetNodes")).toHaveTextContent("yes");
    });

    it("should create SSE connection when projectPath is provided", () => {
      render(
        <FileSyncProvider projectPath="/test/project">
          <TestConsumer />
        </FileSyncProvider>,
      );

      expect(global.EventSource).toHaveBeenCalledWith(
        "http://localhost:8000/api/project/files/events?project_path=%2Ftest%2Fproject",
      );
    });

    it("should not create SSE connection when projectPath is null", () => {
      render(
        <FileSyncProvider projectPath={null}>
          <TestConsumer />
        </FileSyncProvider>,
      );

      expect(global.EventSource).not.toHaveBeenCalled();
    });

    it("should set isConnected to true when SSE connection opens", async () => {
      render(
        <FileSyncProvider projectPath="/test/project">
          <TestConsumer />
        </FileSyncProvider>,
      );

      expect(screen.getByTestId("connected")).toHaveTextContent("disconnected");

      // Simulate connection open
      if (mockEventSource.onopen) {
        mockEventSource.onopen();
      }

      await waitFor(() => {
        expect(screen.getByTestId("connected")).toHaveTextContent("connected");
      });
    });

    it("should set isConnected to false when SSE connection errors", async () => {
      render(
        <FileSyncProvider projectPath="/test/project">
          <TestConsumer />
        </FileSyncProvider>,
      );

      // First open the connection
      if (mockEventSource.onopen) {
        mockEventSource.onopen();
      }

      await waitFor(() => {
        expect(screen.getByTestId("connected")).toHaveTextContent("connected");
      });

      // Simulate connection error
      if (mockEventSource.onerror) {
        mockEventSource.onerror();
      }

      await waitFor(() => {
        expect(screen.getByTestId("connected")).toHaveTextContent("disconnected");
      });

      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it("should clean up SSE connection on unmount", () => {
      const { unmount } = render(
        <FileSyncProvider projectPath="/test/project">
          <TestConsumer />
        </FileSyncProvider>,
      );

      unmount();

      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it("should reconnect with exponential backoff after error", () => {
      vi.useFakeTimers();

      render(
        <FileSyncProvider projectPath="/test/project">
          <TestConsumer />
        </FileSyncProvider>,
      );

      // Simulate connection error
      if (mockEventSource.onerror) {
        mockEventSource.onerror();
      }

      expect(mockEventSource.close).toHaveBeenCalled();

      // Clear previous calls
      const previousCallCount = (global.EventSource as any).mock.calls.length;

      // Fast-forward 1 second (first retry with 2^0 = 1s delay)
      vi.advanceTimersByTime(1000);

      expect((global.EventSource as any).mock.calls.length).toBe(previousCallCount + 1);

      vi.useRealTimers();
    });

    it("should close old connection when projectPath changes", () => {
      const { rerender } = render(
        <FileSyncProvider projectPath="/old/project">
          <TestConsumer />
        </FileSyncProvider>,
      );

      const oldEventSource = mockEventSource;

      // Create new mock for new connection
      const newMockEventSource = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        close: vi.fn(),
        onopen: null,
        onerror: null,
        CONNECTING: 0,
        OPEN: 1,
        CLOSED: 2,
        readyState: 1,
      };
      global.EventSource = vi.fn(() => newMockEventSource) as any;

      rerender(
        <FileSyncProvider projectPath="/new/project">
          <TestConsumer />
        </FileSyncProvider>,
      );

      expect(oldEventSource.close).toHaveBeenCalled();
      expect(global.EventSource).toHaveBeenCalledWith(
        "http://localhost:8000/api/project/files/events?project_path=%2Fnew%2Fproject",
      );
    });
  });

  describe("subscribeToFile", () => {
    it("should call callback when file change event is received", () => {
      const callback = vi.fn();

      function SubscriberComponent() {
        const { subscribeToFile } = useFileSync();
        useEffect(() => {
          return subscribeToFile("/test/file.py", callback);
        }, [subscribeToFile]);
        return null;
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <SubscriberComponent />
        </FileSyncProvider>,
      );

      const fileChangeHandler = eventListeners.get("file_change");
      expect(fileChangeHandler).toBeDefined();

      const event = {
        data: JSON.stringify({
          file_path: "/test/file.py",
          change_type: "modified",
          timestamp: 1234567890,
        }),
      };

      fileChangeHandler!(event);

      expect(callback).toHaveBeenCalledWith({
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: 1234567890,
      });
    });

    it("should not call callback for different file path", () => {
      const callback = vi.fn();

      function SubscriberComponent() {
        const { subscribeToFile } = useFileSync();
        useEffect(() => {
          return subscribeToFile("/test/file.py", callback);
        }, [subscribeToFile]);
        return null;
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <SubscriberComponent />
        </FileSyncProvider>,
      );

      const fileChangeHandler = eventListeners.get("file_change");
      const event = {
        data: JSON.stringify({
          file_path: "/other/file.py",
          change_type: "modified",
          timestamp: 1234567890,
        }),
      };

      fileChangeHandler!(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should unsubscribe when cleanup function is called", () => {
      const callback = vi.fn();

      function SubscriberComponent({ active }: { active: boolean }) {
        const { subscribeToFile } = useFileSync();
        useEffect(() => {
          if (!active) return;
          return subscribeToFile("/test/file.py", callback);
        }, [subscribeToFile, active]);
        return null;
      }

      const { rerender } = render(
        <FileSyncProvider projectPath="/test/project">
          <SubscriberComponent active={true} />
        </FileSyncProvider>,
      );

      // Unsubscribe
      rerender(
        <FileSyncProvider projectPath="/test/project">
          <SubscriberComponent active={false} />
        </FileSyncProvider>,
      );

      const fileChangeHandler = eventListeners.get("file_change");
      const event = {
        data: JSON.stringify({
          file_path: "/test/file.py",
          change_type: "modified",
          timestamp: 1234567890,
        }),
      };

      fileChangeHandler!(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle multiple subscribers for same file", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      function SubscriberComponent() {
        const { subscribeToFile } = useFileSync();
        useEffect(() => {
          const unsubscribe1 = subscribeToFile("/test/file.py", callback1);
          const unsubscribe2 = subscribeToFile("/test/file.py", callback2);
          return () => {
            unsubscribe1();
            unsubscribe2();
          };
        }, [subscribeToFile]);
        return null;
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <SubscriberComponent />
        </FileSyncProvider>,
      );

      const fileChangeHandler = eventListeners.get("file_change");
      const event = {
        data: JSON.stringify({
          file_path: "/test/file.py",
          change_type: "modified",
          timestamp: 1234567890,
        }),
      };

      fileChangeHandler!(event);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("should handle callback errors gracefully", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const callback1 = vi.fn(() => {
        throw new Error("Callback error");
      });
      const callback2 = vi.fn();

      function SubscriberComponent() {
        const { subscribeToFile } = useFileSync();
        useEffect(() => {
          const unsubscribe1 = subscribeToFile("/test/file.py", callback1);
          const unsubscribe2 = subscribeToFile("/test/file.py", callback2);
          return () => {
            unsubscribe1();
            unsubscribe2();
          };
        }, [subscribeToFile]);
        return null;
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <SubscriberComponent />
        </FileSyncProvider>,
      );

      const fileChangeHandler = eventListeners.get("file_change");
      const event = {
        data: JSON.stringify({
          file_path: "/test/file.py",
          change_type: "modified",
          timestamp: 1234567890,
        }),
      };

      fileChangeHandler!(event);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in file change callback:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle malformed JSON in event data", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const callback = vi.fn();

      function SubscriberComponent() {
        const { subscribeToFile } = useFileSync();
        useEffect(() => {
          return subscribeToFile("/test/file.py", callback);
        }, [subscribeToFile]);
        return null;
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <SubscriberComponent />
        </FileSyncProvider>,
      );

      const fileChangeHandler = eventListeners.get("file_change");
      const event = {
        data: "invalid json",
      };

      fileChangeHandler!(event);

      expect(callback).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error parsing file change event:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("registerNodeFile", () => {
    it("should register node with file path", () => {
      function TestComponent() {
        const { registerNodeFile, getNodesForFile } = useFileSync();
        const [nodes, setNodes] = React.useState<string[]>([]);

        useEffect(() => {
          registerNodeFile("node-1", "/test/file.py");
          setNodes(getNodesForFile("/test/file.py"));
        }, [registerNodeFile, getNodesForFile]);

        return <span data-testid="nodes">{nodes.join(",")}</span>;
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <TestComponent />
        </FileSyncProvider>,
      );

      expect(screen.getByTestId("nodes")).toHaveTextContent("node-1");
    });

    it("should register multiple nodes for same file", () => {
      function TestComponent() {
        const { registerNodeFile, getNodesForFile } = useFileSync();
        const [nodes, setNodes] = React.useState<string[]>([]);

        useEffect(() => {
          registerNodeFile("node-1", "/test/file.py");
          registerNodeFile("node-2", "/test/file.py");
          setNodes(getNodesForFile("/test/file.py"));
        }, [registerNodeFile, getNodesForFile]);

        return <span data-testid="nodes">{nodes.join(",")}</span>;
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <TestComponent />
        </FileSyncProvider>,
      );

      const nodesText = screen.getByTestId("nodes").textContent;
      expect(nodesText?.split(",")).toContain("node-1");
      expect(nodesText?.split(",")).toContain("node-2");
    });

    it("should update node file association when changed", () => {
      function TestComponent() {
        const { registerNodeFile, getNodesForFile } = useFileSync();
        const [file1Nodes, setFile1Nodes] = React.useState<string[]>([]);
        const [file2Nodes, setFile2Nodes] = React.useState<string[]>([]);

        useEffect(() => {
          registerNodeFile("node-1", "/file1.py");
          setFile1Nodes(getNodesForFile("/file1.py"));
          setFile2Nodes(getNodesForFile("/file2.py"));

          // Change node-1 to file2
          registerNodeFile("node-1", "/file2.py");
          setFile1Nodes(getNodesForFile("/file1.py"));
          setFile2Nodes(getNodesForFile("/file2.py"));
        }, [registerNodeFile, getNodesForFile]);

        return (
          <div>
            <span data-testid="file1">{file1Nodes.join(",")}</span>
            <span data-testid="file2">{file2Nodes.join(",")}</span>
          </div>
        );
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <TestComponent />
        </FileSyncProvider>,
      );

      expect(screen.getByTestId("file1")).toHaveTextContent("");
      expect(screen.getByTestId("file2")).toHaveTextContent("node-1");
    });
  });

  describe("unregisterNodeFile", () => {
    it("should remove node from file associations", () => {
      function TestComponent() {
        const { registerNodeFile, unregisterNodeFile, getNodesForFile } = useFileSync();
        const [nodes, setNodes] = React.useState<string[]>([]);

        useEffect(() => {
          registerNodeFile("node-1", "/test/file.py");
          unregisterNodeFile("node-1");
          setNodes(getNodesForFile("/test/file.py"));
        }, [registerNodeFile, unregisterNodeFile, getNodesForFile]);

        return <span data-testid="nodes">{nodes.join(",")}</span>;
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <TestComponent />
        </FileSyncProvider>,
      );

      expect(screen.getByTestId("nodes")).toHaveTextContent("");
    });

    it("should handle unregistering non-existent node", () => {
      function TestComponent() {
        const { unregisterNodeFile } = useFileSync();

        useEffect(() => {
          unregisterNodeFile("non-existent-node");
        }, [unregisterNodeFile]);

        return <span data-testid="ok">ok</span>;
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <TestComponent />
        </FileSyncProvider>,
      );

      expect(screen.getByTestId("ok")).toHaveTextContent("ok");
    });
  });

  describe("getNodesForFile", () => {
    it("should return empty array for file with no nodes", () => {
      function TestComponent() {
        const { getNodesForFile } = useFileSync();
        const [nodes, setNodes] = React.useState<string[]>([]);

        useEffect(() => {
          setNodes(getNodesForFile("/test/file.py"));
        }, [getNodesForFile]);

        return <span data-testid="nodes">{nodes.join(",")}</span>;
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <TestComponent />
        </FileSyncProvider>,
      );

      expect(screen.getByTestId("nodes")).toHaveTextContent("");
    });

    it("should return all nodes for a file", () => {
      function TestComponent() {
        const { registerNodeFile, getNodesForFile } = useFileSync();
        const [nodes, setNodes] = React.useState<string[]>([]);

        useEffect(() => {
          registerNodeFile("node-1", "/test/file.py");
          registerNodeFile("node-2", "/test/file.py");
          registerNodeFile("node-3", "/other/file.py");
          setNodes(getNodesForFile("/test/file.py"));
        }, [registerNodeFile, getNodesForFile]);

        return <span data-testid="nodes">{nodes.join(",")}</span>;
      }

      render(
        <FileSyncProvider projectPath="/test/project">
          <TestComponent />
        </FileSyncProvider>,
      );

      const nodesText = screen.getByTestId("nodes").textContent;
      expect(nodesText?.split(",")).toContain("node-1");
      expect(nodesText?.split(",")).toContain("node-2");
      expect(nodesText?.split(",")).not.toContain("node-3");
    });
  });

  describe("useFileSync", () => {
    it("should return default values when used outside provider", () => {
      render(<TestConsumer />);

      expect(screen.getByTestId("connected")).toHaveTextContent("disconnected");
      expect(screen.getByTestId("hasSubscribe")).toHaveTextContent("yes");
      expect(screen.getByTestId("hasRegister")).toHaveTextContent("yes");
      expect(screen.getByTestId("hasUnregister")).toHaveTextContent("yes");
      expect(screen.getByTestId("hasGetNodes")).toHaveTextContent("yes");
    });
  });
});
