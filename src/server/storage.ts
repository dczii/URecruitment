import "server-only";

import { getDb } from "./db";

export const SIGNED_URL_EXPIRES_IN_SECONDS = 300;

const CV_FILES_BUCKET = "cv-files";
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] as const;
const DOCX_ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;

/** Path convention inside the private bucket: `<kind>/<uuid>/<filename>`. */
const ALLOWED_STORAGE_PATH =
  /^(cv|jd)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^/]+$/i;

function assertAllowedCvFilePath(path: string): void {
  if (path.includes("..") || !ALLOWED_STORAGE_PATH.test(path)) {
    throw new Error(
      "Path is outside the cv-files bucket allowed prefix (cv/<uuid>/filename or jd/<uuid>/filename).",
    );
  }
}

function hasMagicPrefix(
  bytes: Uint8Array,
  magic: readonly number[],
): boolean {
  for (let i = 0; i < magic.length; i += 1) {
    if (bytes[i] !== magic[i]) {
      return false;
    }
  }
  return true;
}

function assertAllowedUpload(
  bytes: Uint8Array,
  declaredContentType: string,
): void {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large (oversized): maximum size is 50 MB.");
  }

  const magicMatches =
    (declaredContentType === PDF_MIME && hasMagicPrefix(bytes, PDF_MAGIC)) ||
    (declaredContentType === DOCX_MIME &&
      hasMagicPrefix(bytes, DOCX_ZIP_MAGIC));

  if (!magicMatches) {
    throw new Error(
      "Upload rejected: declared content type does not match file magic bytes. Allowed types are PDF and DOCX.",
    );
  }
}

export async function signCvFilePath(
  path: string,
  expiresInSeconds = SIGNED_URL_EXPIRES_IN_SECONDS,
): Promise<string> {
  assertAllowedCvFilePath(path);
  if (expiresInSeconds > SIGNED_URL_EXPIRES_IN_SECONDS) {
    throw new Error(
      `Signed URL expiresInSeconds exceeds the maximum lifetime of ${SIGNED_URL_EXPIRES_IN_SECONDS} seconds.`,
    );
  }

  const { data, error } = await getDb()
    .storage.from(CV_FILES_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(
      error?.message
        ? `cv-files signed URL failed: ${error.message}`
        : "cv-files signed URL failed",
    );
  }

  return data.signedUrl;
}

export async function uploadCvFile(
  path: string,
  bytes: Uint8Array,
  declaredContentType: string,
): Promise<void> {
  assertAllowedCvFilePath(path);
  assertAllowedUpload(bytes, declaredContentType);

  const { error } = await getDb()
    .storage.from(CV_FILES_BUCKET)
    .upload(path, bytes, { contentType: declaredContentType });

  if (error) {
    throw new Error(`cv-files upload failed: ${error.message}`);
  }
}
