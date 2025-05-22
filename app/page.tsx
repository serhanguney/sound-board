'use client';

import { Suspense } from 'react';
import SoundBoard from './components/sound-board';
import UploadSound from './components/upload-sound';

export default function Home() {
  const showUpload = !!localStorage && !!localStorage.getItem('show_upload');
  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense
        fallback={<div className="text-center py-12">Loading sounds...</div>}
      >
        <div className="container flex-direction-col gap-6 align-center justify-center">
          {showUpload && <UploadSound />}
          <SoundBoard />
        </div>
      </Suspense>
    </div>
  );
}
