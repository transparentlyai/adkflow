import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRunWorkflow } from "@/hooks/home/useRunWorkflow";
import type { TabState } from "@/lib/types";

// Mock the helper hooks
const mockExecutionHandlers = {
  handleRunWorkflow: vi.fn(),
  handleRunConfirmSaveAndRun: vi.fn(),
  handleRunConfirmCancel: vi.fn(),
};

const mockValidationHandlers = {
  handleValidateWorkflow: vi.fn(),
  handleValidationSaveAndValidate: vi.fn(),
  handleValidationSaveCancel: vi.fn(),
};

const mockTopologyHandlers = {
  handleShowTopology: vi.fn(),
  handleTopologySaveAndShow: vi.fn(),
  handleTopologySaveCancel: vi.fn(),
};

const mockStateHandlers = {
  handleRunComplete: vi.fn(),
  handleAgentStateChange: vi.fn(),
  handleToolStateChange: vi.fn(),
  handleUserInputStateChange: vi.fn(),
  handleClearExecutionState: vi.fn(),
  handleCloseRunPanel: vi.fn(),
};

vi.mock("@/hooks/home/helpers/useWorkflowExecution", () => ({
  useWorkflowExecution: vi.fn(() => mockExecutionHandlers),
}));

vi.mock("@/hooks/home/helpers/useWorkflowValidation", () => ({
  useWorkflowValidation: vi.fn(() => mockValidationHandlers),
}));

vi.mock("@/hooks/home/helpers/useTopologyHandlers", () => ({
  useTopologyHandlers: vi.fn(() => mockTopologyHandlers),
}));

vi.mock("@/hooks/home/helpers/useExecutionStateHandlers", () => ({
  useExecutionStateHandlers: vi.fn(() => mockStateHandlers),
}));

import { useWorkflowExecution } from "@/hooks/home/helpers/useWorkflowExecution";
import { useWorkflowValidation } from "@/hooks/home/helpers/useWorkflowValidation";
import { useTopologyHandlers } from "@/hooks/home/helpers/useTopologyHandlers";
import { useExecutionStateHandlers } from "@/hooks/home/helpers/useExecutionStateHandlers";

describe("useRunWorkflow", () => {
  const mockCanvasRef = {
    current: {
      saveFlow: vi.fn(() => ({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      })),
    },
  };

  const mockActiveTab: TabState = {
    id: "tab-1",
    name: "Flow 1",
    order: 0,
    hasUnsavedChanges: false,
    isLoading: false,
  };

  const mockSetIsRunning = vi.fn();
  const mockSetCurrentRunId = vi.fn();
  const mockSetIsRunPanelOpen = vi.fn();
  const mockSetRunEvents = vi.fn();
  const mockSetLastRunStatus = vi.fn();
  const mockSetIsRunConfirmDialogOpen = vi.fn();
  const mockSetIsProjectSaved = vi.fn();
  const mockSetTopologyResult = vi.fn();
  const mockSetIsTopologySaveDialogOpen = vi.fn();
  const mockSetIsValidationSaveDialogOpen = vi.fn();
  const mockSaveTabFlow = vi.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    currentProjectPath: "/path/to/project",
    activeTabId: "tab-1",
    activeTab: mockActiveTab,
    workflowName: "Test Workflow",
    isRunning: false,
    isProjectSaved: true,
    setIsRunning: mockSetIsRunning,
    setCurrentRunId: mockSetCurrentRunId,
    setIsRunPanelOpen: mockSetIsRunPanelOpen,
    setRunEvents: mockSetRunEvents,
    setLastRunStatus: mockSetLastRunStatus,
    setIsRunConfirmDialogOpen: mockSetIsRunConfirmDialogOpen,
    setIsProjectSaved: mockSetIsProjectSaved,
    setTopologyResult: mockSetTopologyResult,
    setIsTopologySaveDialogOpen: mockSetIsTopologySaveDialogOpen,
    setIsValidationSaveDialogOpen: mockSetIsValidationSaveDialogOpen,
    saveTabFlow: mockSaveTabFlow,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveTabFlow.mockResolvedValue(true);
  });

  describe("initialization", () => {
    it("should call useWorkflowExecution with correct props", () => {
      renderHook(() => useRunWorkflow(defaultProps));

      expect(useWorkflowExecution).toHaveBeenCalledWith({
        canvasRef: mockCanvasRef,
        currentProjectPath: "/path/to/project",
        activeTabId: "tab-1",
        activeTab: mockActiveTab,
        workflowName: "Test Workflow",
        isRunning: false,
        isProjectSaved: true,
        setIsRunning: mockSetIsRunning,
        setCurrentRunId: mockSetCurrentRunId,
        setIsRunPanelOpen: mockSetIsRunPanelOpen,
        setRunEvents: mockSetRunEvents,
        setLastRunStatus: mockSetLastRunStatus,
        setIsRunConfirmDialogOpen: mockSetIsRunConfirmDialogOpen,
        setIsProjectSaved: mockSetIsProjectSaved,
        saveTabFlow: mockSaveTabFlow,
      });
    });

    it("should call useWorkflowValidation with correct props", () => {
      renderHook(() => useRunWorkflow(defaultProps));

      expect(useWorkflowValidation).toHaveBeenCalledWith({
        canvasRef: mockCanvasRef,
        currentProjectPath: "/path/to/project",
        activeTabId: "tab-1",
        activeTab: mockActiveTab,
        workflowName: "Test Workflow",
        isProjectSaved: true,
        setRunEvents: mockSetRunEvents,
        setLastRunStatus: mockSetLastRunStatus,
        setIsRunPanelOpen: mockSetIsRunPanelOpen,
        setIsValidationSaveDialogOpen: mockSetIsValidationSaveDialogOpen,
        setIsProjectSaved: mockSetIsProjectSaved,
        saveTabFlow: mockSaveTabFlow,
      });
    });

    it("should call useTopologyHandlers with correct props", () => {
      renderHook(() => useRunWorkflow(defaultProps));

      expect(useTopologyHandlers).toHaveBeenCalledWith({
        canvasRef: mockCanvasRef,
        currentProjectPath: "/path/to/project",
        activeTabId: "tab-1",
        activeTab: mockActiveTab,
        workflowName: "Test Workflow",
        isProjectSaved: true,
        setIsProjectSaved: mockSetIsProjectSaved,
        setTopologyResult: mockSetTopologyResult,
        setIsTopologySaveDialogOpen: mockSetIsTopologySaveDialogOpen,
        setRunEvents: mockSetRunEvents,
        setLastRunStatus: mockSetLastRunStatus,
        setIsRunPanelOpen: mockSetIsRunPanelOpen,
        saveTabFlow: mockSaveTabFlow,
      });
    });

    it("should call useExecutionStateHandlers with correct props", () => {
      renderHook(() => useRunWorkflow(defaultProps));

      expect(useExecutionStateHandlers).toHaveBeenCalledWith({
        canvasRef: mockCanvasRef,
        setIsRunning: mockSetIsRunning,
        setIsRunPanelOpen: mockSetIsRunPanelOpen,
        setCurrentRunId: mockSetCurrentRunId,
      });
    });
  });

  describe("execution handlers", () => {
    it("should return handleRunWorkflow from execution handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleRunWorkflow).toBe(
        mockExecutionHandlers.handleRunWorkflow,
      );
    });

    it("should return handleRunConfirmSaveAndRun from execution handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleRunConfirmSaveAndRun).toBe(
        mockExecutionHandlers.handleRunConfirmSaveAndRun,
      );
    });

    it("should return handleRunConfirmCancel from execution handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleRunConfirmCancel).toBe(
        mockExecutionHandlers.handleRunConfirmCancel,
      );
    });

    it("should call handleRunWorkflow when invoked", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      act(() => {
        result.current.handleRunWorkflow();
      });

      expect(mockExecutionHandlers.handleRunWorkflow).toHaveBeenCalled();
    });
  });

  describe("validation handlers", () => {
    it("should return handleValidateWorkflow from validation handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleValidateWorkflow).toBe(
        mockValidationHandlers.handleValidateWorkflow,
      );
    });

    it("should return handleValidationSaveAndValidate from validation handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleValidationSaveAndValidate).toBe(
        mockValidationHandlers.handleValidationSaveAndValidate,
      );
    });

    it("should return handleValidationSaveCancel from validation handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleValidationSaveCancel).toBe(
        mockValidationHandlers.handleValidationSaveCancel,
      );
    });

    it("should call handleValidateWorkflow when invoked", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      act(() => {
        result.current.handleValidateWorkflow();
      });

      expect(mockValidationHandlers.handleValidateWorkflow).toHaveBeenCalled();
    });
  });

  describe("topology handlers", () => {
    it("should return handleShowTopology from topology handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleShowTopology).toBe(
        mockTopologyHandlers.handleShowTopology,
      );
    });

    it("should return handleTopologySaveAndShow from topology handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleTopologySaveAndShow).toBe(
        mockTopologyHandlers.handleTopologySaveAndShow,
      );
    });

    it("should return handleTopologySaveCancel from topology handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleTopologySaveCancel).toBe(
        mockTopologyHandlers.handleTopologySaveCancel,
      );
    });

    it("should call handleShowTopology when invoked", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      act(() => {
        result.current.handleShowTopology();
      });

      expect(mockTopologyHandlers.handleShowTopology).toHaveBeenCalled();
    });
  });

  describe("state handlers", () => {
    it("should return handleRunComplete from state handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleRunComplete).toBe(
        mockStateHandlers.handleRunComplete,
      );
    });

    it("should return handleAgentStateChange from state handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleAgentStateChange).toBe(
        mockStateHandlers.handleAgentStateChange,
      );
    });

    it("should return handleToolStateChange from state handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleToolStateChange).toBe(
        mockStateHandlers.handleToolStateChange,
      );
    });

    it("should return handleUserInputStateChange from state handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleUserInputStateChange).toBe(
        mockStateHandlers.handleUserInputStateChange,
      );
    });

    it("should return handleClearExecutionState from state handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleClearExecutionState).toBe(
        mockStateHandlers.handleClearExecutionState,
      );
    });

    it("should return handleCloseRunPanel from state handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current.handleCloseRunPanel).toBe(
        mockStateHandlers.handleCloseRunPanel,
      );
    });

    it("should call handleRunComplete when invoked", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      act(() => {
        result.current.handleRunComplete("success");
      });

      expect(mockStateHandlers.handleRunComplete).toHaveBeenCalledWith(
        "success",
      );
    });

    it("should call handleClearExecutionState when invoked", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      act(() => {
        result.current.handleClearExecutionState();
      });

      expect(mockStateHandlers.handleClearExecutionState).toHaveBeenCalled();
    });
  });

  describe("return values", () => {
    it("should return all expected handlers", () => {
      const { result } = renderHook(() => useRunWorkflow(defaultProps));

      expect(result.current).toHaveProperty("handleRunWorkflow");
      expect(result.current).toHaveProperty("handleRunConfirmSaveAndRun");
      expect(result.current).toHaveProperty("handleRunConfirmCancel");
      expect(result.current).toHaveProperty("handleValidateWorkflow");
      expect(result.current).toHaveProperty("handleValidationSaveAndValidate");
      expect(result.current).toHaveProperty("handleValidationSaveCancel");
      expect(result.current).toHaveProperty("handleShowTopology");
      expect(result.current).toHaveProperty("handleTopologySaveAndShow");
      expect(result.current).toHaveProperty("handleTopologySaveCancel");
      expect(result.current).toHaveProperty("handleRunComplete");
      expect(result.current).toHaveProperty("handleAgentStateChange");
      expect(result.current).toHaveProperty("handleToolStateChange");
      expect(result.current).toHaveProperty("handleUserInputStateChange");
      expect(result.current).toHaveProperty("handleClearExecutionState");
      expect(result.current).toHaveProperty("handleCloseRunPanel");
    });
  });

  describe("with different prop values", () => {
    it("should pass isRunning=true to execution handlers", () => {
      const props = { ...defaultProps, isRunning: true };

      renderHook(() => useRunWorkflow(props));

      expect(useWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({ isRunning: true }),
      );
    });

    it("should pass isProjectSaved=false to handlers", () => {
      const props = { ...defaultProps, isProjectSaved: false };

      renderHook(() => useRunWorkflow(props));

      expect(useWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({ isProjectSaved: false }),
      );
      expect(useWorkflowValidation).toHaveBeenCalledWith(
        expect.objectContaining({ isProjectSaved: false }),
      );
      expect(useTopologyHandlers).toHaveBeenCalledWith(
        expect.objectContaining({ isProjectSaved: false }),
      );
    });

    it("should pass null activeTab to handlers", () => {
      const props = { ...defaultProps, activeTab: null };

      renderHook(() => useRunWorkflow(props));

      expect(useWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({ activeTab: null }),
      );
      expect(useWorkflowValidation).toHaveBeenCalledWith(
        expect.objectContaining({ activeTab: null }),
      );
      expect(useTopologyHandlers).toHaveBeenCalledWith(
        expect.objectContaining({ activeTab: null }),
      );
    });
  });
});
