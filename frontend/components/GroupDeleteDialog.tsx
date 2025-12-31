"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface GroupDeleteDialogProps {
  isOpen: boolean;
  groupCount: number;
  childCount: number;
  onCancel: () => void;
  onDeleteGroupOnly: () => void;
  onDeleteAll: () => void;
}

export default function GroupDeleteDialog({
  isOpen,
  groupCount,
  childCount,
  onCancel,
  onDeleteGroupOnly,
  onDeleteAll,
}: GroupDeleteDialogProps) {
  const groupText = groupCount === 1 ? "group" : "groups";
  const childText = childCount === 1 ? "node" : "nodes";

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {groupText}?</AlertDialogTitle>
          <AlertDialogDescription>
            {groupCount === 1
              ? `This group contains ${childCount} ${childText}.`
              : `These ${groupCount} groups contain ${childCount} ${childText} total.`}{" "}
            What would you like to do?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <Button variant="outline" onClick={onDeleteGroupOnly}>
            Delete {groupText} only
          </Button>
          <Button variant="destructive" onClick={onDeleteAll}>
            Delete all
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
