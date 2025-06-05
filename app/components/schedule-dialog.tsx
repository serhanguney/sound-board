"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type SoundMetadata } from "../actions/upload-default-sounds";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sound: SoundMetadata | null;
  onSchedule: (minutes: number, isLooping: boolean) => void;
}

export default function ScheduleDialog({
  open,
  onOpenChange,
  sound,
  onSchedule,
}: ScheduleDialogProps) {
  const [minutes, setMinutes] = React.useState("");
  const [isLooping, setIsLooping] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numMinutes = parseFloat(minutes);
    if (numMinutes >= 0.1 && numMinutes <= 30) {
      onSchedule(numMinutes, isLooping);
      onOpenChange(false);
      setMinutes("");
      setIsLooping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Sound</DialogTitle>
          <DialogDescription>
            {sound
              ? `Schedule "${sound.displayName}" to play after a delay`
              : "Schedule a random sound to play after a delay"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="minutes">Minutes (0.1-30)</Label>
              <Input
                id="minutes"
                type="number"
                min={0.1}
                max={30}
                step={0.1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Enter minutes"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="loop-switch">Loop interval</Label>
              <Switch
                id="loop-switch"
                checked={isLooping}
                onCheckedChange={setIsLooping}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
