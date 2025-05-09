import { Suspense } from "react"
import SoundBoard from "./components/sound-board"
import InitializeSounds from "./components/initialize-sounds"
import UploadSound from "./components/upload-sound"

export default function Home() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={<div className="text-center py-12">Loading sounds...</div>}>
        <InitializeSounds />
        <UploadSound />
        <SoundBoard />
      </Suspense>
    </div>
  )
}
