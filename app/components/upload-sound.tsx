'use client';

import type React from 'react';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { uploadSound } from '../actions/upload-sound';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UploadSound({ onSuccess }: { onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only show if the feature flag is enabled
  if (process.env.NEXT_PUBLIC_UPLOAD_ENABLED !== 'true') {
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('audio/')) {
      setError('Please select an audio file');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Set a default display name based on the filename
    const fileName = selectedFile.name.split('.')[0];
    const formattedName = fileName
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    setDisplayName(formattedName);
  };

  const resetForm = () => {
    setFile(null);
    setDisplayName('');
    setUploadProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update the onSuccess handler in the UploadSound component
  const handleSuccess = () => {
    // Try to call the global refresh function
    // @ts-ignore
    if (typeof window !== 'undefined' && window.refreshSoundBoard) {
      // @ts-ignore
      window.refreshSoundBoard();
    }

    // Call the provided onSuccess callback if any
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 100);

      const result = await uploadSound(file, displayName);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        toast({
          title: 'Upload Successful',
          description: `"${displayName}" has been added to your sound board.`,
        });

        // Reset the form
        resetForm();

        // Call the success handler
        handleSuccess();
      } else {
        setError(result.message || 'Upload failed');
        toast({
          title: 'Upload Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md m-auto mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Sound
        </CardTitle>
        <CardDescription>
          Add your own sounds to the sound board
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sound-file">Sound File</Label>
            <Input
              id="sound-file"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={isUploading}
              ref={fileInputRef}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How this sound will appear on buttons"
              disabled={isUploading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={resetForm}
          disabled={isUploading || (!file && !displayName)}
        >
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={isUploading || !file || !displayName.trim()}
        >
          {isUploading ? (
            <>
              <span className="animate-pulse">Uploading...</span>
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Upload Sound
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
