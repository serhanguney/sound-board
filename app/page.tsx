'use client';

import { Suspense, useState } from 'react';
import SoundBoard from './components/sound-board';
import InitializeSounds from './components/initialize-sounds';
import UploadSound from './components/upload-sound';
import { Switch } from '@/components/ui/switch';

export default function Home() {
  const [showUpload, setShowUpload] = useState(false);
  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense
        fallback={<div className="text-center py-12">Loading sounds...</div>}
      >
        <InitializeSounds />
        <div className="flex mb-4 w-96 gap-2">
          <p className="text-sm text-muted-foreground">Show upload</p>
          <Switch
            onCheckedChange={(value) => setShowUpload(value)}
            title="Show upload"
          />
        </div>
        <div className="container flex gap-6 ">
          {showUpload && <UploadSound />}
          <SoundBoard />
        </div>
      </Suspense>
    </div>
  );
}
