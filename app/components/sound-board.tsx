"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  Bell,
  Clock,
  Drumstick,
  Laugh,
  Music,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Volume2,
  VolumeX,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/components/ui/use-toast"
import { getSounds, type SoundMetadata } from "../actions/upload-default-sounds"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Map sound names to icons
const getIconForSound = (soundName: string) => {
  const name = soundName.toLowerCase()
  if (name.includes("clock") || name.includes("tick")) return <Clock className="h-6 w-6" />
  if (name.includes("applause") || name.includes("clap")) return <ThumbsUp className="h-6 w-6" />
  if (name.includes("boo") || name.includes("negative")) return <ThumbsDown className="h-6 w-6" />
  if (name.includes("drum")) return <Drumstick className="h-6 w-6" />
  if (name.includes("bell") || name.includes("ring")) return <Bell className="h-6 w-6" />
  if (name.includes("tada") || name.includes("success") || name.includes("win")) return <Trophy className="h-6 w-6" />
  if (name.includes("laugh") || name.includes("haha")) return <Laugh className="h-6 w-6" />
  return <Music className="h-6 w-6" />
}

export default function SoundBoard() {
  const [volume, setVolume] = useState(0.7)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [sounds, setSounds] = useState<SoundMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({})
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({})
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Function to trigger a refresh
  const refreshSounds = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // Fetch sounds from Vercel Blob
  useEffect(() => {
    async function loadSounds() {
      try {
        setLoading(true)
        const soundsData = await getSounds()
        console.log("Fetched sounds:", soundsData)
        setSounds(soundsData)
      } catch (error) {
        console.error("Failed to load sounds:", error)
        toast({
          title: "Error",
          description: "Failed to load sound effects. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadSounds()
  }, [refreshTrigger])

  // Initialize audio elements
  useEffect(() => {
    if (sounds.length === 0) return

    const newLoadErrors: Record<string, boolean> = {}

    // Clear previous audio elements
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.pause()
        audio.src = ""
      }
    })

    audioRefs.current = {}

    sounds.forEach((sound) => {
      try {
        console.log(`Creating audio element for ${sound.displayName}: ${sound.blobUrl}`)
        const audio = new Audio()

        // Add error handling before setting src
        audio.onerror = (e) => {
          console.error(`Error loading audio file: ${sound.blobUrl}`, e)
          newLoadErrors[sound.id] = true
          setLoadErrors((prev) => ({ ...prev, [sound.id]: true }))

          toast({
            title: "Loading Error",
            description: `Could not load "${sound.displayName}" sound effect.`,
            variant: "destructive",
          })
        }

        // Add load handler
        audio.onloadeddata = () => {
          console.log(`Successfully loaded audio: ${sound.displayName}`)
        }

        // Add ended event handler
        audio.onended = () => {
          if (currentlyPlaying === sound.id) {
            setCurrentlyPlaying(null)
          }
        }

        // Set audio properties
        audio.preload = "auto"
        audio.volume = volume

        // Set the source last
        audio.src = sound.blobUrl

        audioRefs.current[sound.id] = audio
      } catch (error) {
        console.error(`Error creating audio element for ${sound.displayName}:`, error)
        newLoadErrors[sound.id] = true
      }
    })

    setLoadErrors(newLoadErrors)

    // Cleanup function
    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause()
          audio.src = ""
        }
      })
    }
  }, [sounds, volume])

  // Update volume when it changes
  useEffect(() => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.volume = volume
      }
    })
  }, [volume])

  const playSound = (sound: SoundMetadata) => {
    try {
      // Check if this sound had a loading error
      if (loadErrors[sound.id]) {
        toast({
          title: "Cannot Play Sound",
          description: `The sound "${sound.displayName}" failed to load and cannot be played.`,
          variant: "destructive",
        })
        return
      }

      // Stop any currently playing sound
      if (currentlyPlaying) {
        const currentAudio = audioRefs.current[currentlyPlaying]
        if (currentAudio) {
          currentAudio.pause()
          currentAudio.currentTime = 0
        }
      }

      // Play the new sound
      const audio = audioRefs.current[sound.id]
      if (audio) {
        console.log(`Attempting to play sound: ${sound.displayName}`)
        audio.currentTime = 0

        // Try to play with error handling
        const playPromise = audio.play()

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log(`Successfully playing sound: ${sound.displayName}`)
              setCurrentlyPlaying(sound.id)
            })
            .catch((error) => {
              console.error(`Playback failed for ${sound.displayName}:`, error)
              toast({
                title: "Playback Error",
                description: `Could not play "${sound.displayName}". ${error.message}`,
                variant: "destructive",
              })
            })
        }
      } else {
        console.error(`Audio element not found for sound: ${sound.displayName}`)
      }
    } catch (error) {
      console.error(`Error playing sound ${sound.displayName}:`, error)
    }
  }

  const stopAllSounds = () => {
    Object.entries(audioRefs.current).forEach(([id, audio]) => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    })
    setCurrentlyPlaying(null)
  }

  // Count how many sounds have errors
  const errorCount = Object.values(loadErrors).filter(Boolean).length

  useEffect(() => {
    // @ts-ignore
    window.refreshSoundBoard = refreshSounds
    return () => {
      // @ts-ignore
      delete window.refreshSoundBoard
    }
  }, [refreshSounds])

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">Team Meeting Sound Board</CardTitle>
        <CardDescription>Click on a sound to play it during your meetings</CardDescription>
      </CardHeader>
      <CardContent>
        {errorCount > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Loading Issues</AlertTitle>
            <AlertDescription>
              {errorCount === sounds.length
                ? "All sounds failed to load. Please try refreshing the page."
                : `${errorCount} out of ${sounds.length} sounds failed to load. Some buttons may not work.`}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <VolumeX className="h-4 w-4 text-muted-foreground" />
            <Slider
              className="w-28 md:w-40"
              value={[volume]}
              max={1}
              step={0.1}
              onValueChange={(value) => setVolume(value[0])}
            />
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" onClick={stopAllSounds} disabled={!currentlyPlaying}>
            Stop All Sounds
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : sounds.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No sound effects found. Initialize the sound board to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sounds.map((sound) => (
              <Button
                key={sound.id}
                variant={currentlyPlaying === sound.id ? "default" : "outline"}
                className={`h-24 flex flex-col items-center justify-center gap-2 transition-all ${
                  currentlyPlaying === sound.id ? "bg-primary text-primary-foreground" : ""
                } ${loadErrors[sound.id] ? "opacity-50 cursor-not-allowed" : ""}`}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
