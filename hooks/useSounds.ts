'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSounds, type SoundMetadata } from '@/app/actions/upload-default-sounds';
import { uploadSound } from '@/app/actions/upload-sound';
import { toast } from '@/components/ui/use-toast';

// Key for the sounds query
const SOUNDS_QUERY_KEY = ['sounds'];

/**
 * Hook to fetch all sounds
 */
export function useSounds() {
  return useQuery<SoundMetadata[]>({
    queryKey: SOUNDS_QUERY_KEY,
    queryFn: () => getSounds(),
    refetchOnWindowFocus: false, // Don't refetch when window gets focus
    refetchOnMount: false,      // Don't refetch when component mounts
    refetchOnReconnect: false,  // Don't refetch when reconnecting
    staleTime: Infinity,        // Data never goes stale automatically
    gcTime: Infinity,           // Keep data in cache indefinitely (renamed from cacheTime in v5)
  });
}

/**
 * Hook to upload a new sound
 */
export function useUploadSound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ file, displayName }: { file: File; displayName: string }) => {
      const result = await uploadSound(file, displayName);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to upload sound');
      }
      
      // Add a small delay to ensure the blob is available
      // This helps with the timing issue between upload and availability
      if (result.sound?.blobUrl) {
        try {
          // Verify the URL is accessible before returning
          const maxRetries = 3;
          let retryCount = 0;
          let success = false;
          
          while (retryCount < maxRetries && !success) {
            try {
              console.log(`Verifying sound URL (attempt ${retryCount + 1}): ${result.sound.blobUrl}`);
              const response = await fetch(result.sound.blobUrl, { method: 'HEAD' });
              if (response.ok) {
                console.log('Sound URL verified successfully');
                success = true;
              } else {
                throw new Error(`URL returned status ${response.status}`);
              }
            } catch (error) {
              console.warn(`Verification attempt ${retryCount + 1} failed, retrying...`);
              retryCount++;
              // Wait a bit longer between each retry
              await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
            }
          }
          
          if (!success) {
            console.warn('Could not verify sound URL after multiple attempts, but continuing anyway');
          }
        } catch (error) {
          console.error('Error verifying uploaded sound URL:', error);
          // Continue anyway, as the upload itself was successful
        }
      }
      
      return result;
    },
    onSuccess: (data) => {
      // Wait a moment before invalidating queries to ensure the blob is available
      setTimeout(() => {
        // Invalidate the sounds query to trigger a refetch
        // This is the ONLY place we trigger a refetch of sounds
        queryClient.invalidateQueries({ queryKey: SOUNDS_QUERY_KEY });
        
        // Log that we're refetching sounds after upload
        console.log('Refetching sounds after new upload');
      }, 1000);
      
      toast({
        title: 'Upload Successful',
        description: `"${data.sound?.displayName}" has been added to your sound board.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to initialize default sounds
 */
export function useInitializeSounds() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Import dynamically to avoid server-side issues
      const { uploadDefaultSounds } = await import('@/app/actions/upload-default-sounds');
      const result = await uploadDefaultSounds();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to initialize sounds');
      }
      
      return result;
    },
    onSuccess: (data) => {
      // Invalidate the sounds query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: SOUNDS_QUERY_KEY });
      
      // Set session storage to remember initialization
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('soundsInitialized', 'true');
      }
      
      toast({
        title: 'Success',
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
