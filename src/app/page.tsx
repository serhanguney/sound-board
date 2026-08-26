import { SoundBoard } from '@/features/soundboard/sound-board';
import { UploadSoundForm } from '@/features/sounds/upload-sound-form';

const uploadEnabled = process.env.NEXT_PUBLIC_UPLOAD_ENABLED === 'true';

export default function HomePage() {
  return (
    <main className="container mx-auto flex flex-col items-center gap-6 px-4 py-8">
      {uploadEnabled && <UploadSoundForm />}
      <SoundBoard />
    </main>
  );
}
