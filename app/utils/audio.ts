/**
 * Gets the duration of an audio file from its URL
 * @param url The URL of the audio file
 * @returns Promise that resolves to the duration in seconds
 */
export async function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();

    audio.addEventListener("loadedmetadata", () => {
      resolve(audio.duration);
    });

    audio.addEventListener("error", (error) => {
      reject(new Error(`Failed to load audio: ${error}`));
    });

    audio.src = url;
  });
}

/**
 * Gets durations for multiple audio files
 * @param urls Array of audio file URLs
 * @returns Promise that resolves to an array of durations in seconds
 */
export async function getAudioDurations(urls: string[]): Promise<number[]> {
  const durations = await Promise.all(urls.map((url) => getAudioDuration(url)));
  return durations;
}
