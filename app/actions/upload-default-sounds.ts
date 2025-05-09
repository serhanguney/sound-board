'use server';

import { put, list } from '@vercel/blob';

// Define our default sounds with their display names
const DEFAULT_SOUNDS = [
  {
    filename: 'nervous-clock.mp3',
    displayName: 'Nervous Clock',
    url: 'https://freesound.org/data/previews/232/232006_4337963-lq.mp3',
  },
  {
    filename: 'applause.mp3',
    displayName: 'Applause',
    url: 'https://freesound.org/data/previews/94/94183_1393075-lq.mp3',
  },
  {
    filename: 'boo.mp3',
    displayName: 'Boo',
    url: 'https://freesound.org/data/previews/380/380881_7124502-lq.mp3',
  },
  {
    filename: 'drumroll.mp3',
    displayName: 'Drum Roll',
    url: 'https://freesound.org/data/previews/184/184609_3093072-lq.mp3',
  },
  {
    filename: 'bell.mp3',
    displayName: 'Bell',
    url: 'https://freesound.org/data/previews/411/411089_5121236-lq.mp3',
  },
  {
    filename: 'tada.mp3',
    displayName: 'Ta-Da!',
    url: 'https://freesound.org/data/previews/320/320775_5260872-lq.mp3',
  },
  {
    filename: 'laugh.mp3',
    displayName: 'Laugh Track',
    url: 'https://freesound.org/data/previews/176/176960_3232293-lq.mp3',
  },
  {
    filename: 'jingle.mp3',
    displayName: 'Jingle',
    url: 'https://freesound.org/data/previews/413/413203_7552364-lq.mp3',
  },
];

// Store metadata about our sounds
export type SoundMetadata = {
  id: string;
  displayName: string;
  blobUrl: string;
};

export async function uploadDefaultSounds() {
  try {
    console.log('Starting to upload default sounds...');

    // Check if we already have sounds in the blob store
    const { blobs } = await list();

    // If we have sounds already, return them
    if (blobs.length > 0) {
      console.log('Sounds already exist in Blob store:', blobs.length);

      // Map existing blobs to our metadata format
      const existingSounds = blobs.map((blob) => {
        const filename = blob.pathname.split('/').pop() || '';
        const displayName = extractDisplayName(filename);

        return {
          id: blob.pathname,
          displayName,
          blobUrl: blob.url,
        };
      });

      return {
        success: true,
        message: 'Sounds already exist in Blob store',
        sounds: existingSounds,
      };
    }

    // Upload each default sound
    const uploadPromises = DEFAULT_SOUNDS.map(async (sound) => {
      try {
        // Fetch the sound file
        console.log(`Fetching sound: ${sound.url}`);
        const response = await fetch(sound.url);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch sound: ${sound.url} (${response.status}: ${response.statusText})`
          );
        }

        const file = await response.blob();
        console.log(
          `Successfully fetched sound: ${sound.url}, size: ${file.size} bytes`
        );

        // Use a simpler filename format to avoid potential issues
        const filename = `sounds/${sound.filename}`;

        // Upload to Vercel Blob
        console.log(`Uploading to Blob: ${filename}`);
        const blob = await put(filename, file, {
          access: 'public',
          contentType: file.type || 'audio/mpeg',
        });

        console.log(`Successfully uploaded to Blob: ${blob.url}`);

        return {
          id: blob.pathname,
          displayName: sound.displayName,
          blobUrl: blob.url,
        };
      } catch (error) {
        console.error(`Error uploading sound ${sound.filename}:`, error);
        throw error;
      }
    });

    const results = await Promise.all(uploadPromises);
    console.log('Successfully uploaded all default sounds:', results.length);

    return {
      success: true,
      message: 'Successfully uploaded all default sounds',
      sounds: results,
    };
  } catch (error) {
    console.error('Error uploading default sounds:', error);
    return {
      success: false,
      message: `Error uploading default sounds: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

// Function to extract display name from filename
function extractDisplayName(filename: string): string {
  // Remove file extension
  const nameWithoutExt = filename.split('.').slice(0, -1).join('.');

  // Extract the base filename without path
  const baseName = nameWithoutExt.split('/').pop() || nameWithoutExt;

  // Format the name nicely
  return baseName
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Function to get all sounds with their metadata
export async function getSounds(
  forceRefresh = false
): Promise<SoundMetadata[]> {
  try {
    console.log('Fetching sounds from Blob store...');

    // Use a cache key that can be invalidated
    const cacheKey = forceRefresh ? `sounds-${Date.now()}` : 'sounds';

    const { blobs } = await list({ prefix: 'sounds/', limit: 100 });
    console.log(`Found ${blobs.length} blobs in store`);

    // Debug: log all blob paths
    blobs.forEach((blob) => {
      console.log(`Blob path: ${blob.pathname}, URL: ${blob.url}`);
    });

    return blobs.flatMap((blob) => {
      const filename = blob.pathname.split('/').pop() || blob.pathname;
      const displayName = extractDisplayName(filename);

      return displayName
        ? [{ id: blob.pathname, displayName, blobUrl: blob.url }]
        : [];
    });
  } catch (error) {
    console.error('Error fetching sounds:', error);
    return [];
  }
}
