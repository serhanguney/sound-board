'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Sound } from '@/domain/sound';
import type { SoundTag } from '@/domain/sound-tag';
import { listSounds, uploadSound } from '@/server/sounds';
import { toast } from '@/hooks/use-toast';

export const soundsQueryKey = ['sounds'] as const;

export function useSounds() {
  return useQuery<readonly Sound[]>({
    queryKey: soundsQueryKey,
    queryFn: listSounds,
    // The blob listing is small and rarely changes; a minute of freshness
    // avoids a refetch on every window focus without going stale-forever.
    staleTime: 60_000,
  });
}

export function useUploadSound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      file: File;
      displayName: string;
      tag: SoundTag;
    }) => {
      const formData = new FormData();
      formData.set('file', input.file);
      formData.set('displayName', input.displayName);
      formData.set('tag', input.tag);

      const result = await uploadSound(formData);
      if (!result.ok) throw new Error(result.error);
      return result.sound;
    },

    onSuccess: async (sound) => {
      // Seed the cache with the uploaded sound so it appears immediately,
      // then reconcile with the blob store. This replaces the previous
      // `setTimeout(..., 1000)` that guessed at propagation delay.
      queryClient.setQueryData<readonly Sound[]>(soundsQueryKey, (current) => {
        const existing = current ?? [];
        const withoutDuplicate = existing.filter(
          (item) => item.id !== sound.id
        );
        return [...withoutDuplicate, sound].sort((a, b) =>
          a.displayName.localeCompare(b.displayName)
        );
      });

      await queryClient.invalidateQueries({ queryKey: soundsQueryKey });

      toast({
        title: 'Sound added',
        description: `"${sound.displayName}" is now on the board.`,
      });
    },

    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
