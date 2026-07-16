'use client';

import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, RefreshCw, Plus, Loader2, X, AlertCircle } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import imageCompression from 'browser-image-compression';

interface CameraCaptureProps {
  photoUrls: { id: string; originalUrl: string; annotatedUrl: string; annotationsJson: string }[];
  onChange: (photos: { id: string; originalUrl: string; annotatedUrl: string; annotationsJson: string }[]) => void;
  onAnnotateTapped: (photoIndex: number) => void;
}

export default function CameraCapture({ photoUrls, onChange, onAnnotateTapped }: CameraCaptureProps) {
  const [compressing, setCompressing] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Compress helper
  const compressImage = async (file: File): Promise<string> => {
    const options = {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };
    try {
      const compressedFile = await imageCompression(file, options);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(compressedFile);
      });
    } catch (e) {
      console.error('Compression failed, using original', e);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  // Web input file change handler
  const handleWebFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressing(true);
    setShowSourceSelector(false);
    const newPhotos = [...photoUrls];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await compressImage(file);
      newPhotos.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        originalUrl: base64,
        annotatedUrl: base64,
        annotationsJson: ''
      });
    }

    onChange(newPhotos);
    setCompressing(false);
    // Reset file inputs
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Trigger Native or Web Camera
  const triggerCamera = () => {
    if (Capacitor.isNativePlatform()) {
      triggerCameraNative();
    } else {
      setShowSourceSelector(false);
      cameraInputRef.current?.click();
    }
  };

  const triggerCameraNative = async () => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (photo.webPath) {
        setCompressing(true);
        setShowSourceSelector(false);
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const base64 = await compressImage(file);
        
        const newPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          originalUrl: base64,
          annotatedUrl: base64,
          annotationsJson: ''
        };
        onChange([...photoUrls, newPhoto]);
        setCompressing(false);
      }
    } catch (err) {
      console.warn('Native camera failed, falling back to web camera trigger', err);
      setShowSourceSelector(false);
      cameraInputRef.current?.click();
    }
  };

  // Trigger Native or Web Gallery
  const triggerGallery = () => {
    if (Capacitor.isNativePlatform()) {
      triggerGalleryNative();
    } else {
      setShowSourceSelector(false);
      galleryInputRef.current?.click();
    }
  };

  const triggerGalleryNative = async () => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (photo.webPath) {
        setCompressing(true);
        setShowSourceSelector(false);
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const base64 = await compressImage(file);
        
        const newPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          originalUrl: base64,
          annotatedUrl: base64,
          annotationsJson: ''
        };
        onChange([...photoUrls, newPhoto]);
        setCompressing(false);
      }
    } catch (err) {
      console.warn('Native gallery failed, falling back to web file explorer', err);
      setShowSourceSelector(false);
      galleryInputRef.current?.click();
    }
  };

  const deletePhoto = (id: string) => {
    onChange(photoUrls.filter(p => p.id !== id));
  };

  const retakePhoto = async (id: string) => {
    // Retake defaults to Camera directly
    try {
      const photo = await CapCamera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (photo.webPath) {
        setCompressing(true);
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const base64 = await compressImage(file);

        const updated = photoUrls.map(p => {
          if (p.id === id) {
            return { ...p, originalUrl: base64, annotatedUrl: base64, annotationsJson: '' };
          }
          return p;
        });
        onChange(updated);
        setCompressing(false);
      }
    } catch (e) {
      console.warn('Retake native failed, triggering web camera', e);
      cameraInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* File Selectors (Hidden Web Fallbacks) */}
      {/* Gallery Selector */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleWebFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Camera Capture Selector */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleWebFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Inspection Photos ({photoUrls.length})
        </label>
        {compressing && (
          <span className="flex items-center gap-1 text-[10px] text-accent font-bold animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" /> Compressing...
          </span>
        )}
      </div>

      {/* Grid of photo previews */}
      <div className="grid grid-cols-3 gap-3">
        {photoUrls.map((photo, index) => (
          <div 
            key={photo.id} 
            className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-sm"
          >
            {/* Display annotated version if exists, otherwise original */}
            <img
              src={photo.annotatedUrl || photo.originalUrl}
              alt="Inspection photo"
              className="h-full w-full object-cover cursor-pointer"
              onClick={() => onAnnotateTapped(index)}
            />

            {/* Quick Actions overlay */}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/80 to-transparent p-2 opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => retakePhoto(photo.id)}
                className="rounded-full bg-slate-800/80 p-1.5 text-white hover:bg-slate-700"
                title="Retake photo"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => deletePhoto(photo.id)}
                className="rounded-full bg-rose-600/85 p-1.5 text-white hover:bg-rose-600"
                title="Delete photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            
            {/* Annotation badge indicator */}
            {photo.annotationsJson && (
              <span className="absolute right-2 top-2 rounded-md bg-gradient-to-r from-gradient-from to-gradient-to px-1 text-[8px] font-bold text-white uppercase tracking-wider">
                Annotated
              </span>
            )}
          </div>
        ))}

        {/* Add photo trigger card */}
        <button
          type="button"
          onClick={() => setShowSourceSelector(true)}
          className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-accent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400 ripple"
        >
          <Plus className="h-6 w-6 text-slate-400" />
          <span className="mt-1 text-xs font-semibold">Add Photo</span>
        </button>
      </div>

      {/* Select Photo Source Bottom Sheet */}
      {showSourceSelector && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-md rounded-t-3xl bg-surface p-6 border-t border-border shadow-2xl space-y-4 pb-8">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">Select Photo Source</h3>
              <button 
                onClick={() => setShowSourceSelector(false)}
                className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Option 1: Camera */}
              <button
                type="button"
                onClick={triggerCamera}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-center font-semibold text-xs space-y-2 text-foreground ripple"
              >
                <div className="h-10 w-10 rounded-full bg-accent-surface flex items-center justify-center text-accent">
                  <Camera className="h-5 w-5" />
                </div>
                <span>Take Photo</span>
              </button>

              {/* Option 2: Storage */}
              <button
                type="button"
                onClick={triggerGallery}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-center font-semibold text-xs space-y-2 text-foreground ripple"
              >
                <div className="h-10 w-10 rounded-full bg-accent-surface flex items-center justify-center text-accent">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <span>Choose Gallery</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <p className="text-[10px] text-slate-400 dark:text-slate-500">
        Tip: Tap any captured photo to launch the markup annotation tool (arrow, box, circle, number markers, etc.).
      </p>
    </div>
  );
}
