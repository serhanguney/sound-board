import { SoundBoard } from '@/features/soundboard/sound-board';
import { UploadSoundForm } from '@/features/sounds/upload-sound-form';

const uploadEnabled = process.env.NEXT_PUBLIC_UPLOAD_ENABLED === 'true';

export default function HomePage() {
  return (
    <>
      <SoundBoard />
      {uploadEnabled && (
        <div className="mx-auto max-w-[1400px] px-6 pb-12">
          <UploadSoundForm />
        </div>
      )}
    </>
  );
}
