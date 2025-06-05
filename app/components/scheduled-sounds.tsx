"use client";

import React, { useEffect, useState, useRef } from "react";
import { Clock, X, Calendar, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type SoundMetadata } from "../actions/upload-default-sounds";
import ScheduleDialog from "./schedule-dialog";
import { getAudioDuration } from "@/app/utils/audio";

interface ScheduledSound {
  id: string;
  name: string;
  icon: React.ReactNode;
  scheduledTime: number; // minutes
  isRandom: boolean;
  isLooping?: boolean;
}

interface ScheduledSoundsProps {
  scheduledSounds: ScheduledSound[];
  onPlaySound: (sound: SoundMetadata) => void;
  onCancelSchedule: (id: string) => void;
  onSchedule: (minutes: number, isLooping: boolean) => void;
  sounds: SoundMetadata[];
  currentlyPlaying: string | null;
  setCurrentlyPlaying: (sound: string | null) => void;
}

export default function ScheduledSounds({
  scheduledSounds,
  onPlaySound,
  onCancelSchedule,
  onSchedule,
  sounds,
  currentlyPlaying,
  setCurrentlyPlaying,
}: ScheduledSoundsProps) {
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [lastPlayedTime, setLastPlayedTime] = useState<Record<string, number>>(
    {}
  );
  const [soundsToPlay, setSoundsToPlay] = useState<
    Array<{ sound: SoundMetadata; isRandom: boolean }>
  >([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize timers for new scheduled sounds
  useEffect(() => {
    setTimers((prev) => {
      const newTimers = { ...prev };
      scheduledSounds.forEach((sound) => {
        if (!newTimers[sound.id]) {
          newTimers[sound.id] = sound.scheduledTime * 60; // Convert minutes to seconds
        }
      });
      return newTimers;
    });
  }, [scheduledSounds]);

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const newTimers = { ...prev };
        let newSoundsToPlay: Array<{
          sound: SoundMetadata;
          isRandom: boolean;
        }> = [];

        // Update timers and check if any sound should play
        Object.keys(newTimers).forEach((id) => {
          if (newTimers[id] > 0) {
            newTimers[id] -= 1;
          } else {
            const sound = scheduledSounds.find((s) => s.id === id);
            if (sound) {
              const now = Date.now();
              const lastPlayed = lastPlayedTime[id] || 0;
              // Only play if it's been at least 1 second since last play
              if (now - lastPlayed >= 1000) {
                if (sound.isRandom) {
                  const randomSound =
                    sounds[Math.floor(Math.random() * sounds.length)];
                  if (randomSound) {
                    newSoundsToPlay.push({
                      sound: randomSound,
                      isRandom: true,
                    });
                  }
                } else {
                  const soundMetadata = sounds.find(
                    (s) => s.displayName === sound.name
                  );
                  if (soundMetadata) {
                    newSoundsToPlay.push({
                      sound: soundMetadata,
                      isRandom: false,
                    });
                  }
                }
                setLastPlayedTime((prev) => ({
                  ...prev,
                  [id]: now,
                }));

                // Handle looping
                if (sound.isLooping) {
                  newTimers[id] = sound.scheduledTime * 60;
                } else {
                  onCancelSchedule(id);
                }
              }
            }
          }
        });

        if (newSoundsToPlay.length > 0) {
          setSoundsToPlay(newSoundsToPlay);
        }

        return newTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scheduledSounds, sounds, lastPlayedTime, onCancelSchedule]);

  // Handle playing sounds
  useEffect(() => {
    if (soundsToPlay.length > 0) {
      const { sound } = soundsToPlay[0];
      // Only play if no sound is currently playing
      if (!currentlyPlaying) {
        onPlaySound(sound);
        setCurrentlyPlaying(sound.id);
        // Clear the played sound
        setSoundsToPlay((prev) => prev.slice(1));
      }
    }
  }, [soundsToPlay, onPlaySound, setCurrentlyPlaying, currentlyPlaying]);

  // Handle resetting currentlyPlaying
  useEffect(() => {
    const stopTime = async (current: string) => {
      const currentSound = sounds.find((s) => s.id === current);
      const currentSoundDuration = currentSound?.blobUrl
        ? await getAudioDuration(currentSound.blobUrl)
        : null;

      if (currentSoundDuration) {
        const timeout = setTimeout(() => {
          setCurrentlyPlaying(null);
        }, currentSoundDuration * 1000);
        return () => clearTimeout(timeout);
      }
    };
    if (currentlyPlaying) stopTime(currentlyPlaying);
  }, [currentlyPlaying, setCurrentlyPlaying, sounds]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (scheduledSounds.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scheduled Sounds</h2>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setShowScheduleDialog(true)}
            disabled={sounds.length === 0}
          >
            <Calendar className="h-4 w-4" />
            Schedule Random Sound
          </Button>
        </div>
        <ScheduleDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          sound={null}
          onSchedule={onSchedule}
        />
      </div>
    );
  }

  // Sort sounds by remaining time
  const sortedSounds = [...scheduledSounds].sort((a, b) => {
    const timeA = timers[a.id] || 0;
    const timeB = timers[b.id] || 0;
    return timeA - timeB;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Scheduled Sounds</h2>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setShowScheduleDialog(true)}
          disabled={sounds.length === 0}
        >
          <Calendar className="h-4 w-4" />
          Schedule Random Sound
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedSounds.map((sound) => (
          <Card key={sound.id} className="relative group max-w-[280px]">
            <CardContent className="p-4">
              <div className="flex items-end justify-center gap-2">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatTimeRemaining(timers[sound.id] || 0)}
                    {sound.isLooping && (
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                    {sound.name}
                  </span>
                </div>
              </div>

              {/* Hover controls */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-md">
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => onCancelSchedule(sound.id)}
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ScheduleDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        sound={null}
        onSchedule={onSchedule}
      />
    </div>
  );
}
