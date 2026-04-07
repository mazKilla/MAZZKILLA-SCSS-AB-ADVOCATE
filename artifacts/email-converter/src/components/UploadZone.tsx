import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, Loader2, AlertCircle } from 'lucide-react';
import { useUploadEmailFile } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getListJobsQueryKey } from '@workspace/api-client-react';
import { cn } from '@/lib/utils';
import { TWindow, TButton } from './TerminalUI';

export function UploadZone() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useUploadEmailFile({
    mutation: {
      onSuccess: () => {
        // Invalidate jobs list to trigger refresh
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        setError(null);
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || err.message || "Failed to upload file");
      }
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    if (file) {
      if (!file.name.endsWith('.eml') && !file.name.endsWith('.mbox')) {
        setError("Invalid file type. Only .eml and .mbox are supported.");
        return;
      }
      uploadMutation.mutate({ data: { file } });
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    accept: {
      'message/rfc822': ['.eml'],
      'application/mbox': ['.mbox'],
      'application/octet-stream': ['.eml', '.mbox']
    }
  });

  return (
    <TWindow title="SYS.INPUT_STREAM" className="mb-8">
      <div 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative overflow-hidden",
          isDragActive ? "border-primary bg-primary/10 scale-[1.02]" : "border-primary/30 hover:border-primary/60 hover:bg-primary/5",
          uploadMutation.isPending && "pointer-events-none opacity-80"
        )}
      >
        <input {...getInputProps()} />
        
        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center text-primary animate-pulse">
            <Loader2 className="w-12 h-12 mb-4 animate-spin" />
            <p className="text-xl font-bold tracking-widest text-glow">PROCESSING_STREAM...</p>
            <p className="text-sm mt-2 text-primary/70">UPLOADING & INITIALIZING CONVERSION</p>
          </div>
        ) : (
          <>
            <div className="bg-background border border-primary/50 p-4 rounded-full mb-4 shadow-[0_0_15px_rgba(0,255,0,0.15)] group-hover:scale-110 transition-transform">
              <Upload className={cn("w-8 h-8", isDragActive ? "text-primary animate-bounce" : "text-primary/70")} />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">INITIATE_UPLOAD</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Drag & drop <span className="text-primary">.eml</span> or <span className="text-primary">.mbox</span> files here, or click to select from local storage. System will automatically parse and structure contents.
            </p>
            
            <TButton variant="outline" className="pointer-events-none">
              SELECT_FILE
            </TButton>
          </>
        )}

        {isDragActive && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-sm z-10 border-4 border-primary">
            <p className="text-3xl font-bold text-primary text-glow animate-pulse">DROP_TO_EXECUTE</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive text-destructive flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">ERR_UPLOAD_FAILED</p>
            <p>{error}</p>
          </div>
        </div>
      )}
    </TWindow>
  );
}
