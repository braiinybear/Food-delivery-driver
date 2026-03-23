import apiClient from "@/lib/axios";
import * as FileSystem from "expo-file-system/legacy";

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  original_filename: string;
}
/**
 * Custom type for React Native FormData file uploads.
 * React Native's FormData implementation requires an object with 
 * uri, type, and name to handle native file streaming.
 */
export interface ReactNativeFile {
  uri: string;
  type: string;
  name: string;
}
/**
 * Validate image before upload
 */
export async function validateImage(
  imageUri: string,
  maxSizeMB: number = 5,
): Promise<boolean> {
  try {
    // Use Expo FileSystem.getInfoAsync() to get file information
    const fileInfo = await FileSystem.getInfoAsync(imageUri);

    if (!fileInfo.exists) {
      throw new Error("File does not exist at the provided URI.");
    }

    if (!fileInfo.size || fileInfo.size === 0) {
      throw new Error("Unable to determine file size.");
    }

    const fileSizeMB = fileInfo.size / (1024 * 1024);

    if (fileSizeMB > maxSizeMB) {
      throw new Error(
        `Image size ${fileSizeMB.toFixed(2)}MB exceeds limit of ${maxSizeMB}MB`,
      );
    }

    return true;
  } catch (error) {
    console.error("Image validation error:", error);
    throw error;
  }
}

/**
 * Upload an image to Cloudinary
 */
export async function uploadImageToCloudinary(
  imageUri: string,
  folder?: string,
  publicId?: string,
): Promise<CloudinaryUploadResponse> {
  // 1. Validate environment variables
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Missing Cloudinary configuration. Check EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env",
    );
  }

  try {
    // 2. Determine file metadata
    const fileExtension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = getMimeType(fileExtension);
    const fileName = `upload_${Date.now()}.${fileExtension}`;

    // 3. Create FormData (React Native specific format)
    const formData = new FormData();
    
    // In React Native, we append an object with uri, type, and name for files
    formData.append("file", {
      uri: imageUri,
      type: mimeType,
      name: fileName,
    } as any);

    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    if (folder) formData.append("folder", folder);
    if (publicId) formData.append("public_id", publicId);

    // 4. Upload to Cloudinary using Axios
    const response = await apiClient.post<CloudinaryUploadResponse>(
      CLOUDINARY_API_URL,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        transformRequest: (data) => data,
      },
    );

    if (!response.data?.secure_url) {
      throw new Error("Invalid response from Cloudinary");
    }

    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error("Cloudinary upload error:", errorMessage);
    throw new Error(errorMessage || "Failed to upload image to Cloudinary");
  }
}

/**
 * Upload multiple images
 */
export async function uploadMultipleImagesToCloudinary(
  imageUris: string[],
  folder?: string,
): Promise<CloudinaryUploadResponse[]> {
  const uploadPromises = imageUris.map((uri, index) =>
    uploadImageToCloudinary(uri, folder, `image_${Date.now()}_${index}`),
  );
  return Promise.all(uploadPromises);
}

/**
 * Get MIME type
 */
function getMimeType(extension?: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return mimeTypes[extension?.toLowerCase() || "jpg"] || "image/jpeg";
}