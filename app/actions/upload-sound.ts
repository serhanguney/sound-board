'use server';

import { put } from '@vercel/blob';
import { getSounds } from './upload-default-sounds';

export async function uploadSound(file: File, displayName: string) {
  try {
    // Validate file
    if (!file || !file.type.startsWith('audio/')) {
      return {
        success: false,
        message: 'Invalid file. Please upload an audio file.',
      };
    }

    // Validate display name
    if (!displayName || displayName.trim() === '') {
      return {
        success: false,
        message: 'Please provide a display name for the sound.',
      };
    }

    // Create a safe filename from the display name
    const safeFilename = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Get the file extension
    const fileExtension = file.name.split('.').pop() || 'mp3';

    // Create the full filename
    const filename = `sounds/${safeFilename}.${fileExtension}`;

    console.log(`Uploading file to ${filename}`);

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
    });

    console.log(`Successfully uploaded to Blob: ${blob.url}`);

    // Refresh the sounds list
    await getSounds(true); // Force refresh

    return {
      success: true,
      message: 'Sound uploaded successfully',
      sound: {
        id: blob.pathname,
        displayName,
        blobUrl: blob.url,
      },
    };
  } catch (error) {
    console.error('Error uploading sound:', error);
    return {
      success: false,
      message: `Error uploading sound: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
