/** Lado maior da foto enviada: nítida para conferir no balcão e bem abaixo do limite de 5 MB do back-end. */
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Reduz a foto tirada pelo celular (que costuma passar de 5 MB) antes do envio, e já a deixa em pé conforme a
 * orientação da câmera. Se o navegador não conseguir reduzir, envia o arquivo original e o back-end decide.
 */
export async function shrinkPhoto(file: Blob): Promise<Blob> {
  if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
