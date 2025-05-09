import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get("file") as File
  const filename = (form.get("filename") as string) || file.name

  // Ensure the file is an audio file
  if (!file.type.startsWith("audio/")) {
    return NextResponse.json({ error: "File must be an audio file" }, { status: 400 })
  }

  // Upload to Vercel Blob
  const blob = await put(`sounds/${filename}`, file, {
    access: "public",
    addRandomSuffix: false, // Use exact filename
  })

  return NextResponse.json(blob)
}
