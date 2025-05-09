"use client"

import { useEffect, useState } from "react"
import { uploadDefaultSounds } from "../actions/upload-default-sounds"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function InitializeSounds() {
  const [isInitializing, setIsInitializing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // Check if we've already initialized in this session
    const hasInitialized = sessionStorage.getItem("soundsInitialized")
    if (hasInitialized === "true") {
      setIsInitialized(true)
      return
    }

    // Auto-initialize on first load
    initializeSounds()
  }, [])

  async function initializeSounds() {
    try {
      setIsInitializing(true)
      setError(null)

      console.log("Initializing sounds...")
      const result = await uploadDefaultSounds()
      console.log("Initialization result:", result)

      if (result.success) {
        setIsInitialized(true)
        sessionStorage.setItem("soundsInitialized", "true")
        toast({
          title: "Success",
          description: result.message,
        })
      } else {
        setError(result.message)
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error initializing sounds:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsInitializing(false)
    }
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    initializeSounds()
  }

  if (isInitialized) return null

  return (
    <div className="mb-6">
      <Alert variant={error ? "destructive" : "default"}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Sound Initialization</AlertTitle>
        <AlertDescription className="flex flex-col gap-4">
          {error ? (
            <>
              <p>Error initializing sounds: {error}</p>
              <Button onClick={handleRetry} disabled={isInitializing} variant="outline" className="w-fit">
                <RefreshCw className={`mr-2 h-4 w-4 ${isInitializing ? "animate-spin" : ""}`} />
                {isInitializing ? "Retrying..." : "Retry Initialization"}
              </Button>
            </>
          ) : (
            <>
              <p>
                {isInitializing
                  ? "Uploading default sounds to Vercel Blob..."
                  : "Your sound board needs to be initialized with default sounds."}
              </p>
              <Button onClick={initializeSounds} disabled={isInitializing} variant="outline" className="w-fit">
                {isInitializing ? "Initializing..." : "Initialize Sound Board"}
              </Button>
            </>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
