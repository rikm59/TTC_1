'use strict';

/**
 * Cloudinary — permanent media storage for videos and images.
 *
 * Set these three env vars in Render to enable:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Without them the function returns null and callers fall back to the
 * ephemeral Render URL (works until the next server restart).
 *
 * Free tier: 25 GB storage, 25 GB/month bandwidth — more than enough.
 * Sign up at https://cloudinary.com (no credit card required).
 */

import { createHash }       from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { basename }         from 'path';

export function cloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Upload a local file to Cloudinary and return the permanent HTTPS URL.
 * @param {string} filePath    - absolute path to the file
 * @param {'image'|'video'|'raw'} resourceType
 * @returns {Promise<string|null>}  permanent URL, or null if not configured / upload failed
 */
export async function uploadMedia(filePath, resourceType = 'image') {
  if (!cloudinaryConfigured()) return null;
  if (!existsSync(filePath))  return null;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder    = 'xpert-life';
  const timestamp = Math.round(Date.now() / 1000);

  // SHA-1 signature: alphabetically-sorted param string + API secret
  const sigStr    = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash('sha1').update(sigStr).digest('hex');

  const buf  = readFileSync(filePath);
  const form = new FormData();
  form.append('file',      new Blob([buf]), basename(filePath));
  form.append('api_key',   apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder',    folder);

  try {
    const res  = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      { method: 'POST', body: form, signal: AbortSignal.timeout(120_000) }
    );
    const data = await res.json();
    if (!data.secure_url) {
      throw new Error(JSON.stringify(data).slice(0, 200));
    }
    return data.secure_url;
  } catch (err) {
    console.warn(`[Cloudinary] Upload failed (${err.message}) — using local URL`);
    return null;
  }
}
