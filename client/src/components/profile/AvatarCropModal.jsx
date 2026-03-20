import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import LoadingSpinner from '../common/LoadingSpinner';
import imageCompression from 'browser-image-compression';
import { 
  XMarkIcon, 
  CameraIcon, 
  MagnifyingGlassMinusIcon, 
  MagnifyingGlassPlusIcon 
} from '@heroicons/react/24/outline';

/**
 * Utility: create a cropped image from the crop area
 */
async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Output at max 512x512
  const size = Math.min(pixelCrop.width, 512);
  canvas.width = size;
  canvas.height = size;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/jpeg',
      0.9
    );
  });
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });
}

export default function AvatarCropModal({ isOpen, onClose, onUpload }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'crop' | 'preview'

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Please select a JPG, PNG, or WEBP image.');
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setStep('crop');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleCrop = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
    const previewUrl = URL.createObjectURL(croppedBlob);
    setPreview({ url: previewUrl, blob: croppedBlob });
    setStep('preview');
  };

  const handleSave = async () => {
    if (!preview?.blob) return;
    setUploading(true);

    try {
      // Compress
      const compressed = await imageCompression(
        new File([preview.blob], 'avatar.jpg', { type: 'image/jpeg' }),
        {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 512,
          useWebWorker: true,
        }
      );
      await onUpload(compressed);
      handleClose();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setPreview(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setStep('select');
    setCroppedAreaPixels(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            {step === 'select' && 'Choose Photo'}
            {step === 'crop' && 'Adjust & Crop'}
            {step === 'preview' && 'Preview'}
          </h3>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
          >
            <XMarkIcon className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Step 1: Select File */}
          {step === 'select' && (
            <div className="flex flex-col items-center gap-6">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gray-50 border-2 border-dashed border-gray-200">
                <CameraIcon className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Upload a profile photo</p>
                <p className="mt-1 text-xs text-gray-400">JPG, PNG, or WEBP · Max 5MB</p>
              </div>
              <label className="cursor-pointer rounded-full bg-primary-600 px-8 py-3 text-sm font-bold text-white shadow-md shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98]">
                Choose Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Step 2: Crop */}
          {step === 'crop' && imageSrc && (
            <div className="space-y-5">
              <div className="relative mx-auto h-72 w-72 overflow-hidden rounded-2xl bg-gray-900">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* Zoom slider */}
              <div className="flex items-center gap-3 px-2">
                <MagnifyingGlassMinusIcon className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={2} />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none bg-gray-200 accent-primary-600 cursor-pointer"
                />
                <MagnifyingGlassPlusIcon className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={2} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setStep('select'); setImageSrc(null); }}
                  className="flex-1 rounded-full border-2 border-gray-200 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleCrop}
                  className="flex-1 rounded-full bg-primary-600 py-3 text-sm font-bold text-white shadow-md shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98]"
                >
                  Crop
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && preview && (
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <img
                  src={preview.url}
                  alt="Preview"
                  className="h-48 w-48 rounded-full object-cover ring-4 ring-primary-50 shadow-lg"
                />
              </div>
              <p className="text-md font-semibold text-gray-800">Does this look good?</p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setStep('crop')}
                  disabled={uploading}
                  className="flex-1 rounded-full border-2 border-gray-200 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-50"
                >
                  Re-crop
                </button>
                <button
                  onClick={handleSave}
                  disabled={uploading}
                  className="flex-1 rounded-full bg-primary-600 py-3 text-sm font-bold text-white shadow-md shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-60"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2 text-white">
                      <LoadingSpinner size="sm" />
                      Uploading…
                    </span>
                  ) : (
                    'Save Photo'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
