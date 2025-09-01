interface UploadedPhoto {
  id: string;
  url: string;
  caption?: string;
  metadata?: string;
}

export interface PhotoUploadResult {
  success: boolean;
  uploadedPhotos: UploadedPhoto[];
  errors: string[];
  message: string;
}

export async function uploadPhotosToAlbum(
  albumId: string,
  files: File[]
): Promise<PhotoUploadResult> {
  const formData = new FormData();
  formData.append("albumId", albumId);

  files.forEach((file, _index) => {
    formData.append("photos", file);
  });

  try {
    const response = await fetch("/api/photos/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload photos");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Photo upload error:", error);
    throw error;
  }
}

export function createPhotoPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "File must be an image";
  }

  if (file.size > 10 * 1024 * 1024) {
    return "File size must be less than 10MB";
  }

  return null;
}

export function validateImageFiles(files: File[]): {
  validFiles: File[];
  errors: string[];
} {
  const validFiles: File[] = [];
  const errors: string[] = [];

  files.forEach((file) => {
    const error = validateImageFile(file);
    if (error) {
      errors.push(`${file.name}: ${error}`);
    } else {
      validFiles.push(file);
    }
  });

  return { validFiles, errors };
}
