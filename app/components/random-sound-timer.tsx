'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { type SoundMetadata } from '../actions/upload-default-sounds';

interface RandomSoundTimerProps {
  sounds: SoundMetadata[];
  onPlaySound: (sound: SoundMetadata) => void;
  disabled: boolean;
}

export default function RandomSoundTimer({
  sounds,
  onPlaySound,
  disabled,
}: RandomSoundTimerProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [interval, setInterval] = useState(15); // Default 15 minutes
  const [nextSoundTime, setNextSoundTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  // Use number type for timer IDs in browser environment
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  // Add a ref to track if a sound is currently being played
  const isPlayingRef = useRef<boolean>(false);

  // Initialize or reset the countdown with the specified interval
  const initializeCountdown = () => {
    // Convert minutes to seconds for the countdown
    const totalSeconds = interval * 60;
    setSecondsLeft(totalSeconds);

    // Calculate and set the target time
    const now = new Date();
    const next = new Date(now.getTime() + totalSeconds * 1000);
    setNextSoundTime(next);

    // Format and set the initial time remaining display
    updateTimeRemainingDisplay(totalSeconds);

    return totalSeconds;
  };

  // Update the time remaining display based on seconds left
  const updateTimeRemainingDisplay = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedTime = `${minutes}m:${remainingSeconds
      .toString()
      .padStart(2, '0')}s`;
    setTimeRemaining(formattedTime);
  };

  // Play a random sound
  const playRandomSound = () => {
    // Prevent multiple sounds from playing at once
    if (sounds.length === 0 || disabled || isPlayingRef.current) return;

    // Set the playing flag to true
    isPlayingRef.current = true;

    // Filter out the last played sound to avoid repetition
    const availableSounds = lastPlayedId
      ? sounds.filter((sound) => sound.id !== lastPlayedId)
      : sounds;

    if (availableSounds.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    // Select a random sound
    const randomIndex = Math.floor(Math.random() * availableSounds.length);
    const selectedSound = availableSounds[randomIndex];

    // Play the sound
    onPlaySound(selectedSound);
    setLastPlayedId(selectedSound.id);

    // Show toast notification
    toast({
      title: 'Random Sound Played',
      description: `Playing "${selectedSound.displayName}"`,
    });

    // Reset the playing flag after a short delay to prevent rapid consecutive plays
    setTimeout(() => {
      isPlayingRef.current = false;
    }, 1000);

    // Restart the countdown
    if (isEnabled) {
      startTimer();
    }
  };

  // Start the timer
  const startTimer = () => {
    // Clear any existing timers
    stopTimer();

    // Initialize countdown and get total seconds
    const totalSeconds = initializeCountdown();

    // We'll handle the sound playing in the countdown interval instead
    // This is just a backup in case something goes wrong with the countdown
    timerRef.current = window.setTimeout(() => {
      // This should rarely be reached since the countdown interval should handle it
      console.log('Backup timer triggered');
      playRandomSound();
    }, totalSeconds * 1000 + 500); // Add a small buffer

    // Set up countdown update - update every second
    countdownRef.current = window.setInterval(() => {
      setSecondsLeft((prevSeconds) => {
        // If we've reached zero, play sound and restart timer
        if (prevSeconds <= 0) {
          // Clear the main timeout since we're handling it here
          if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }

          // Play a random sound
          playRandomSound();

          // Reset to the full interval
          const newTotal = interval * 60;
          updateTimeRemainingDisplay(newTotal);
          return newTotal;
        }

        // Otherwise, decrement and update display
        const newSecondsLeft = prevSeconds - 1;
        updateTimeRemainingDisplay(newSecondsLeft);

        return newSecondsLeft;
      });
    }, 1000);
  };

  // Stop the timer
  const stopTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    setNextSoundTime(null);
    setTimeRemaining('');
    setSecondsLeft(0);
  };

  // Toggle timer
  const toggleTimer = (value: boolean) => {
    setIsEnabled(value);
    if (value) {
      startTimer();
    } else {
      stopTimer();
    }
  };

  // Handle interval change
  const handleIntervalChange = (value: number) => {
    setInterval(value);
    if (isEnabled) {
      // Restart timer with new interval
      startTimer();
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  // Disable timer if there are no sounds or if disabled
  useEffect(() => {
    if ((sounds.length === 0 || disabled) && isEnabled) {
      toggleTimer(false);
      toast({
        title: 'Random Sound Timer Disabled',
        description:
          'Timer has been disabled because there are no available sounds.',
        variant: 'destructive',
      });
    }
  }, [sounds, disabled, isEnabled]);

  return (
    <Card className="mb-4 relative">
      {isEnabled && nextSoundTime && (
        <div className="absolute top-3 right-3">
          <Badge
            variant="secondary"
            className="flex items-center gap-1 text-md px-3 py-1 font-medium"
          >
            <Clock className="h-4 w-4 text-primary" /> {timeRemaining}
          </Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shuffle className="h-4 w-4" /> Random Sound Timer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={toggleTimer}
                disabled={sounds.length === 0 || disabled}
              />
              <Label htmlFor="timer-switch">
                {isEnabled ? 'Timer Active' : 'Timer Inactive'}
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="interval-slider">Interval (minutes)</Label>
              <span className="text-sm">{interval} min</span>
            </div>
            <Slider
              id="interval-slider"
              min={1}
              max={30}
              step={1}
              value={[interval]}
              onValueChange={(values) => handleIntervalChange(values[0])}
              disabled={sounds.length === 0 || disabled}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 min</span>
              <span>30 min</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
