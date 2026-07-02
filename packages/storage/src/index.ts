import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

// Local-disk driver for development without R2 (no card / no write token needed).
// Flip STORAGE_DRIVER=local to use it; production defaults to R2.
const useLocal = () => process.env.STORAGE_DRIVER === "local";
const localBase = () => resolve(process.env.LOCAL_STORAGE_DIR ?? join(process.cwd(), ".storage"));
const localPath = (key: string) => join(localBase(), key);

/**
 * Cloudflare R2 storage (S3-compatible). Holds three kinds of objects:
 *   uploads/…    — student uploads (assignment photos, PDFs)
 *   templates/…  — locked institutional .docx/.pptx template assets
 *   exports/…    — rendered DOCX/PPTX/PDF outputs
 *
 * Configured lazily so the package imports cleanly before env vars exist.
 */
function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} (Cloudflare R2 not configured).`);
  return v;
}

let _client: S3Client | undefined;

export function r2(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return _client;
}

const bucket = () => env("R2_BUCKET");

/** Upload bytes to R2 and return the object key. */
export async function putObject(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string,
): Promise<string> {
  if (useLocal()) {
    const p = localPath(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, typeof body === "string" ? body : Buffer.from(body));
    return key;
  }
  await r2().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  );
  return key;
}

/** Download an object's bytes (e.g. a template) into a Buffer for the renderer. */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  if (useLocal()) {
    return readFile(localPath(key));
  }
  const res = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

export async function deleteObject(key: string): Promise<void> {
  if (useLocal()) {
    await unlink(localPath(key)).catch(() => {});
    return;
  }
  await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** Time-limited URL to download a private object (e.g. a student's rendered report). */
export function signedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  return getSignedUrl(r2(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: expiresInSeconds,
  });
}

/** Time-limited URL the client can PUT directly to (for large uploads from the browser/phone). */
export function signedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<string> {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn: expiresInSeconds },
  );
}

export const keys = {
  upload: (userId: string, id: string, ext: string) => `uploads/${userId}/${id}.${ext}`,
  template: (templateId: string, ext: string) => `templates/${templateId}.${ext}`,
  exportFile: (documentId: string, format: string) => `exports/${documentId}.${format.toLowerCase()}`,
  /** A generated slide image (per deck, per slide index). PNG bytes live in storage, not the DB. */
  slideImage: (documentId: string, slideIndex: number) => `slides/${documentId}/${slideIndex}.png`,
  /** A generated illustrative image for a project's build plan (per project, per image index). */
  projectImage: (documentId: string, idx: number) => `projects/${documentId}/${idx}.png`,
};
