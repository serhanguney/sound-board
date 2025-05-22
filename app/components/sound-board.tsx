'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bell,
  Clock,
  Drumstick,
  Laugh,
  Music,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Pause,
  Play,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/use-toast';
import { type SoundMetadata } from '../actions/upload-default-sounds';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSounds } from '@/hooks/useSounds';
import RandomSoundTimer from './random-sound-timer';

// Map sound names to icons
const getIconForSound = (soundName: string) => {
  const name = soundName.toLowerCase();
  if (name.includes('clock') || name.includes('tick'))
    return <Clock className="h-6 w-6" />;
  if (name.includes('applause') || name.includes('clap'))
    return <ThumbsUp className="h-6 w-6" />;
  if (name.includes('boo') || name.includes('negative'))
    return <ThumbsDown className="h-6 w-6" />;
  if (name.includes('drum')) return <Drumstick className="h-6 w-6" />;
  if (name.includes('bell') || name.includes('ring'))
    return <Bell className="h-6 w-6" />;
  if (name.includes('tada') || name.includes('success') || name.includes('win'))
    return <Trophy className="h-6 w-6" />;
  if (name.includes('laugh') || name.includes('haha'))
    return <Laugh className="h-6 w-6" />;
  return <Music className="h-6 w-6" />;
};

export default function SoundBoard() {
  const [volume, setVolume] = useState(0.7);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});
  const [loopingIds, setLoopingIds] = useState<Record<string, boolean>>({});
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  // Use React Query to fetch sounds
  const {
    data: sounds = [],
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useSounds();

  // Function to trigger a refresh
  const refreshSounds = useCallback(() => {
    refetch();
  }, [refetch]);

  // Initialize audio elements
  useEffect(() => {
    if (!sounds || sounds.length === 0) return;

    console.log('Initializing audio elements for', sounds.length, 'sounds');
    const newLoadErrors: Record<string, boolean> = {};

    // Clear previous audio elements
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    });

    audioRefs.current = {};

    // Function to load a single sound with retries
    const loadSoundWithRetry = async (sound: SoundMetadata, retryCount = 0) => {
      const maxRetries = 3;

      try {
        console.log(
          `Creating audio element for ${sound.displayName}: ${sound.blobUrl}`
        );

        // Verify the URL is accessible first
        try {
          const response = await fetch(sound.blobUrl, { method: 'HEAD' });
          if (!response.ok) {
            throw new Error(`URL returned status ${response.status}`);
          }
        } catch (fetchError) {
          console.error(`Error checking URL ${sound.blobUrl}:`, fetchError);
          if (retryCount < maxRetries) {
            console.log(
              `Retrying (${retryCount + 1}/${maxRetries}) for ${
                sound.displayName
              }`
            );
            // Wait a bit before retrying
            setTimeout(() => loadSoundWithRetry(sound, retryCount + 1), 500);
            return;
          } else {
            throw new Error('Max retries reached');
          }
        }

        const audio = new Audio();

        // Add error handling before setting src
        audio.onerror = (e) => {
          console.error(`Error loading audio file: ${sound.blobUrl}`, e);
          if (retryCount < maxRetries) {
            console.log(
              `Retrying (${retryCount + 1}/${maxRetries}) for ${
                sound.displayName
              }`
            );
            // Wait a bit before retrying
            setTimeout(() => loadSoundWithRetry(sound, retryCount + 1), 500);
          } else {
            console.error(
              `Failed to load ${sound.displayName} after ${maxRetries} retries`
            );
            newLoadErrors[sound.id] = true;
            setLoadErrors((prev) => ({ ...prev, [sound.id]: true }));
          }
        };

        // Add load handler
        audio.onloadeddata = () => {
          console.log(`Successfully loaded audio: ${sound.displayName}`);
          // Remove from errors if it was previously marked as an error
          if (newLoadErrors[sound.id]) {
            delete newLoadErrors[sound.id];
            setLoadErrors((prev) => {
              const updated = { ...prev };
              delete updated[sound.id];
              return updated;
            });
          }
        };

        // Add ended event handler
        audio.onended = () => {
          if (currentlyPlaying === sound.id) {
            if (loopingIds[sound.id]) {
              // If looping is enabled, restart the sound
              audio.currentTime = 0;
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                playPromise.catch((error) => {
                  console.error(
                    `Error restarting looped sound: ${sound.displayName}`,
                    error
                  );
                  setCurrentlyPlaying(null);
                });
              }
            } else {
              // Otherwise, stop playing
              setCurrentlyPlaying(null);
            }
          }
        };

        // Set audio properties
        audio.crossOrigin = 'anonymous'; // Try with CORS enabled
        audio.preload = 'auto';
        audio.volume = volume;

        // Set the source last
        audio.src = sound.blobUrl;

        audioRefs.current[sound.id] = audio;
      } catch (error) {
        console.error(
          `Error creating audio element for ${sound.displayName}:`,
          error
        );
        newLoadErrors[sound.id] = true;
        setLoadErrors((prev) => ({ ...prev, [sound.id]: true }));
      }
    };

    // Load each sound
    sounds.forEach((sound) => {
      loadSoundWithRetry(sound);
    });

    // Cleanup function
    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  // Only depend on sounds and volume, not on currentlyPlaying
  // This prevents re-initialization when play/pause state changes
  }, [sounds, volume]);

  // Update volume when it changes
  useEffect(() => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.volume = volume;
      }
    });
  }, [volume]);

  const playSound = (sound: SoundMetadata) => {
    try {
      // Check if this sound had a loading error
      if (loadErrors[sound.id]) {
        toast({
          title: 'Cannot Play Sound',
          description: `The sound "${sound.displayName}" failed to load and cannot be played.`,
          variant: 'destructive',
        });
        return;
      }

      // If the sound is already playing, do nothing
      if (currentlyPlaying === sound.id) {
        return;
      }

      // Stop any currently playing sound
      if (currentlyPlaying) {
        stopSound(currentlyPlaying);
      }

      // Play the new sound
      const audio = audioRefs.current[sound.id];
      if (audio) {
        console.log(`Attempting to play sound: ${sound.displayName}`);
        audio.currentTime = 0;
        // Set loop property based on loopingIds state
        audio.loop = !!loopingIds[sound.id];

        // Try to play with error handling
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log(`Successfully playing sound: ${sound.displayName}`);
              setCurrentlyPlaying(sound.id);
            })
            .catch((error) => {
              console.error(`Playback failed for ${sound.displayName}:`, error);
              toast({
                title: 'Playback Error',
                description: `Could not play "${sound.displayName}". ${error.message}`,
                variant: 'destructive',
              });
            });
        }
      } else {
        console.error(
          `Audio element not found for sound: ${sound.displayName}`
        );
      }
    } catch (error) {
      console.error(`Error playing sound ${sound.displayName}:`, error);
    }
  };

  const stopSound = (soundId: string) => {
    const audio = audioRefs.current[soundId];
    if (audio) {
      // Disable loop before pausing to prevent auto-restart
      const wasLooping = audio.loop;
      if (wasLooping) {
        audio.loop = false;
      }

      // Just pause the audio without resetting currentTime
      // This prevents potential reloading issues
      audio.pause();

      // Update the playing state
      if (currentlyPlaying === soundId) {
        setCurrentlyPlaying(null);
      }

      // Restore loop setting after a short delay to ensure pause takes effect
      if (wasLooping && loopingIds[soundId]) {
        setTimeout(() => {
          if (audioRefs.current[soundId]) {
            audioRefs.current[soundId]!.loop = true;
          }
        }, 100);
      }
    }
  };

  const toggleLoop = (soundId: string) => {
    setLoopingIds((prev) => {
      const newState = { ...prev };
      newState[soundId] = !prev[soundId];

      // Update the audio element's loop property if it's currently playing
      if (soundId === currentlyPlaying && audioRefs.current[soundId]) {
        audioRefs.current[soundId]!.loop = newState[soundId];
      }

      return newState;
    });
  };

  const stopAllSounds = () => {
    Object.entries(audioRefs.current).forEach(([id, audio]) => {
      if (audio) {
        // Disable loop before pausing to prevent auto-restart
        const wasLooping = audio.loop;
        if (wasLooping) {
          audio.loop = false;
        }

        // Just pause the audio without resetting currentTime
        audio.pause();

        // Restore loop setting after a short delay to ensure pause takes effect
        if (wasLooping && loopingIds[id]) {
          setTimeout(() => {
            if (audioRefs.current[id]) {
              audioRefs.current[id]!.loop = true;
            }
          }, 100);
        }
      }
    });
    setCurrentlyPlaying(null);
  };

  // Count how many sounds have errors
  const errorCount = Object.values(loadErrors).filter(Boolean).length;

  useEffect(() => {
    // @ts-ignore
    window.refreshSoundBoard = refreshSounds;
    return () => {
      // @ts-ignore
      delete window.refreshSoundBoard;
    };
  }, [refreshSounds]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-between items-center">
          <CardTitle className="text-3xl">Team Meeting Sound Board</CardTitle>
          <Button
            variant="outline"
            size="icon"
            onClick={refreshSounds}
            disabled={loading}
            title="Refresh sounds"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Random Sound Timer */}
        <div className="mt-4">
          <RandomSoundTimer 
            sounds={sounds} 
            onPlaySound={playSound} 
            disabled={loading || sounds.length === 0 || Object.keys(loadErrors).length === sounds.length}
          />
        </div>
        
        <CardDescription>
          Click on a sound to play it during your meetings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Sounds</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load sounds'}
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={refreshSounds}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {errorCount > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Loading Issues</AlertTitle>
            <AlertDescription>
              {errorCount === sounds.length
                ? 'All sounds failed to load. Please try refreshing.'
                : `${errorCount} out of ${sounds.length} sounds failed to load. Some buttons may not work.`}
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={refreshSounds}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Sounds
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : sounds.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No sound effects found. Initialize the sound board to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sounds.map((sound) => (
              <div key={sound.id} className="relative group">
                <Button
                  variant={
                    currentlyPlaying === sound.id ? 'default' : 'outline'
                  }
                  className={`w-full h-24 flex flex-col items-center justify-center gap-2 transition-all ${
                    currentlyPlaying === sound.id
                      ? 'bg-primary text-primary-foreground'
                      : ''
                  } ${
                    loadErrors[sound.id] ? 'opacity-50 cursor-not-allowed' : ''
                  } ${loopingIds[sound.id] ? 'border-green-500 border-2' : ''}`}
                  onClick={() => playSound(sound)}
                  disabled={loadErrors[sound.id]}
                >
                  {loadErrors[sound.id] ? (
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  ) : (
                    getIconForSound(sound.displayName)
                  )}
                  <span className="text-sm">{sound.displayName}</span>
                </Button>

                {/* Hover controls */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-md">
                  <div className="flex gap-2">
                    {currentlyPlaying === sound.id ? (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          stopSound(sound.id);
                        }}
                        title="Stop"
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          playSound(sound);
                        }}
                        title="Play"
                        disabled={loadErrors[sound.id]}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant={loopingIds[sound.id] ? 'default' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLoop(sound.id);
                      }}
                      title={
                        loopingIds[sound.id] ? 'Disable loop' : 'Enable loop'
                      }
                      disabled={loadErrors[sound.id]}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
