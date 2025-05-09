"use server"

import { list } from "@vercel/blob"

export type Sound = {
  id: string
  name: string
  icon: string
  url: string
}

// Map icon names to their display names
const soundDisplayNames: Record<string, string> = {
  "clock-ticking": "Nervous Clock",
  applause: "Applause",
  boo: "Boo",
  drumroll: "Drum Roll",
  bell: "Bell",
  tada: "Ta-Da!",
  laugh: "Laugh Track",
  jingle: "Jingle",
}

// Map icon names to their icon types
const soundIcons: Record<string, string> = {
  "clock-ticking": "Clock",
  applause: "ThumbsUp",
  boo: "ThumbsDown",
  drumroll: "Drumstick",
  bell: "Bell",
  tada: "Trophy",
  laugh: "Laugh",
  jingle: "Music",
}

export async function getSounds(): Promise<Sound[]> {
  try {
    // List all blobs in the 'sounds' directory
    const { blobs } = await list({ prefix: "sounds/" })

    // Map the blobs to our Sound type
    return blobs.map((blob) => {
      // Extract the filename without extension and directory
      const filename = blob.pathname.split("/").pop()?.split(".")[0] || ""

      return {
        id: filename,
        name: soundDisplayNames[filename] || filename,
        icon: soundIcons[filename] || "Music",
        url: blob.url,
      }
    })
  } catch (error) {
    console.error("Error fetching sounds from Vercel Blob:", error)
    return []
  }
}
