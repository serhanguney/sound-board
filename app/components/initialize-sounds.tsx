"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useInitializeSounds } from "@/hooks/useSounds"

export default function InitializeSounds() {
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Use React Query for initializing sounds
  const { 
    mutate: initializeSounds, 
    isPending: isInitializing, 
    isError,
    error
  } = useInitializeSounds()

  useEffect(() => {
    // Check if we've already initialized in this session
    const hasInitialized = sessionStorage.getItem("soundsInitialized")
    if (hasInitialized === "true") {
      setIsInitialized(true)
      return
    }

    // Auto-initialize on first load
    initializeSounds()
  }, [initializeSounds])

  const handleRetry = () => {
    initializeSounds()
  }

  if (isInitialized) return null

  const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

  return (
    <div className="mb-6">
      <Alert variant={isError ? "destructive" : "default"}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Sound Initialization</AlertTitle>
        <AlertDescription className="flex flex-col gap-4">
          {isError ? (
            <>
              <p>Error initializing sounds: {errorMessage}</p>
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
              <Button onClick={() => initializeSounds()} disabled={isInitializing} variant="outline" className="w-fit">
                {isInitializing ? "Initializing..." : "Initialize Sound Board"}
              </Button>
            </>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
