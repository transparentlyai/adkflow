"use client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Plus } from "lucide-react";
import Tab from "./Tab";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { TabState } from "@/lib/types";

// Modifier to restrict drag movement to horizontal axis only
const restrictToHorizontalAxis: Modifier = ({ transform }) => {
  return {
    ...transform,
    y: 0,
  };
};

interface TabBarProps {
  tabs: TabState[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabDelete: (tabId: string) => void;
  onTabRename: (tabId: string, name: string) => void;
  onTabReorder: (tabIds: string[]) => void;
  onAddTab: () => void;
  onDuplicateTab: (tabId: string) => void;
}

export default function TabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabDelete,
  onTabRename,
  onTabReorder,
  onAddTab,
  onDuplicateTab,
}: TabBarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);

      const newOrder = [...tabs];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);

      onTabReorder(newOrder.map((t) => t.id));
    }
  };

  const sortedTabs = [...tabs].sort((a, b) => a.order - b.order);

  return (
    <div className="flex items-center border-b bg-muted/30 px-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToHorizontalAxis]}
      >
        <SortableContext
          items={sortedTabs.map((t) => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex items-center overflow-x-auto overflow-y-hidden scrollbar-hide">
            {sortedTabs.map((tab) => (
              <ContextMenu key={tab.id}>
                <ContextMenuTrigger asChild>
                  <div>
                    <Tab
                      tab={tab}
                      isActive={tab.id === activeTabId}
                      onClick={() => onTabClick(tab.id)}
                      onRename={(name) => onTabRename(tab.id, name)}
                    />
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() => onTabRename(tab.id, tab.name)}
                  >
                    Rename
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => onDuplicateTab(tab.id)}>
                    Duplicate
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => onTabDelete(tab.id)}
                    disabled={tabs.length <= 1}
                    className="text-destructive"
                  >
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add tab button */}
      <button
        onClick={onAddTab}
        className="ml-1 p-1.5 hover:bg-muted rounded transition-colors flex-shrink-0"
        title="Add new tab"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
