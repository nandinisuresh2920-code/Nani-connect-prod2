"use client";

import React, { useState, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Camera, UploadCloud, X } from 'lucide-react';

interface ProductImageUploadProps {
  initialImageUrl?: string;
  onFileSelect: (file: File | null) => void;
  onImageUrlChange: (url: string) => void;
}

const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  initialImageUrl,
  onFileSelect,
  onImageUrlChange,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialImageUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  React.useEffect(() => {
    setPreviewUrl(initialImageUrl);
  }, [initialImageUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      onFileSelect(file);
      onImageUrlChange(''); // Clear direct URL if a file is selected
    } else {
      setSelectedFile(null);
      setPreviewUrl(initialImageUrl); // Revert to initial if no file selected
      onFileSelect(null);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(undefined);
    onFileSelect(null);
    onImageUrlChange('');
    // Reset the file input value to allow re-uploading the same file
    const fileInput = document.getElementById('product-image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="product-image-upload">Product Image</Label>
      <div className="flex items-center space-x-2">
        <Input
          id="product-image-upload"
          type="file"
          accept="image/*"
          capture="environment" // 'environment' for rear camera, 'user' for front camera
          onChange={handleFileChange}
          className="hidden" // Hide the default input
        />
        <Label htmlFor="product-image-upload" className="flex-1 cursor-pointer">
          <Button asChild variant="outline" className="w-full">
            <span>
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload from Gallery / Take Photo
            </span>
          </Button>
        </Label>
      </div>
      {previewUrl && (
        <div className="relative w-full h-48 border rounded-md overflow-hidden">
          <img src={previewUrl} alt="Product Preview" className="w-full h-full object-cover" />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 rounded-full"
            onClick={handleClearImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {!selectedFile && initialImageUrl && !previewUrl && (
        <p className="text-sm text-muted-foreground">No image selected. Current image will be retained.</p>
      )}
    </div>
  );
};

export default ProductImageUpload;