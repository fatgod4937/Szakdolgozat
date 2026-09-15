const MAX_IMAGE_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

function compressedFileName(name: string) {
  const extensionIndex = name.lastIndexOf(".");
  const baseName = extensionIndex > 0 ? name.slice(0, extensionIndex) : name;
  return `${baseName}.jpg`;
}

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be compressed.");
  }

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The image could not be read."));
      element.src = sourceUrl;
    });
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("The image could not be compressed.")),
        "image/jpeg",
        JPEG_QUALITY,
      );
    });

    return new File([blob], compressedFileName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
