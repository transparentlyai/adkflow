import type { TraceSpan } from "@evilmartians/agent-prism-types";
import type { KeyboardEvent, MouseEvent } from "react";

import { useCallback } from "react";

export const useSpanCardEventHandlers = (
  data: TraceSpan,
  onSpanSelect?: (span: TraceSpan) => void,
) => {
  const handleCardClick = useCallback((): void => {
    onSpanSelect?.(data);
  }, [data, onSpanSelect]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardClick();
      }
    },
    [handleCardClick],
  );

  const handleToggleClick = useCallback(
    (e: MouseEvent | KeyboardEvent): void => {
      e.stopPropagation();
    },
    [],
  );

  return {
    handleCardClick,
    handleKeyDown,
    handleToggleClick,
  };
};
