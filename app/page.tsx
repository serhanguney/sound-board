'use client';

import { Suspense, useState, useEffect } from 'react';
import SoundBoard from './components/sound-board';
import UploadSound from './components/upload-sound';

export default function Home() {
  const [showUpload, setShowUpload] = useState(false);
  
  useEffect(() => {
    // Check localStorage only on the client side
    const shouldShowUpload = localStorage && localStorage.getItem('show_upload');
    setShowUpload(!!shouldShowUpload);
  }, []);
  
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
