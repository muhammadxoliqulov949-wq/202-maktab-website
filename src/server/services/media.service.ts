import "server-only";

import { randomUUID } from "node:crypto";
import { AppError } from "@/server/errors/AppError";
import { getEnv } from "@/server/config/env";
import { createScopedSupabase } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { dbGuard } from "@/server/repositories/supabase/db";
import { audit } from "@/server/services/audit";
import { logger } from "@/server/observability/logger";
import type { AdminActor } from "@/server/auth/actor";

/**
 * Phase 4 — admin media uploads.
 *
 * Authorization: only an authenticated, ACTIVE admin holding `media.write`.
 * The Storage write itself is performed with the administrator's OWN JWT, so
 * the `media_admin_write` RLS policy is what actually authorises it — the
 * service-role key is used only for the `media_assets` metadata row.
 *
 * Boundaries enforced here (before anything is buffered or stored):
 *  - MIME allow-list (no executables, no HTML, no scripts)
 *  - extension must match the declared MIME type
 *  - hard size cap (`MEDIA_MAX_BYTES`, default 8 MiB)
 *  - the client-supplied filename is NEVER used as the object path
 */

const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "image/avif": ["avif"],
  "image/svg+xml": ["svg"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "application/pdf": ["pdf"],
};

const BUCKET = "media";

export type MediaAsset = Record<string, unknown>;

function assertSupabase(): void {
  if (getEnv().DATA_PROVIDER !== "supabase") {
    throw AppError.serviceUnavailable("Media library requires DATA_PROVIDER=supabase (Supabase Storage).");
  }
}

export async function listMedia(): Promise<{ items: MediaAsset[]; note: string }> {
  if (getEnv().DATA_PROVIDER !== "supabase") {
    return {
      items: [],
      note: "Media library listing requires DATA_PROVIDER=supabase (metadata lives in media_assets).",
    };
  }
  const sb = supabaseService();
  const res = await sb.from("media_assets").select("*").order("created_at", { ascending: false }).limit(200);
  const rows = dbGuard(res.error, res.data) ?? [];
  return { items: rows as MediaAsset[], note: `Supabase Storage \`${BUCKET}\` bucket.` };
}

function extensionOf(filename: string): string {
  const clean = filename.replace(/[/\\]/g, "_");
  const i = clean.lastIndexOf(".");
  return i === -1 ? "" : clean.slice(i + 1).toLowerCase().slice(0, 10);
}

export async function uploadMedia(
  input: { filename: string; mimeType: string; bytes: Uint8Array; altText?: string | null },
  accessToken: string,
  actor: AdminActor
): Promise<MediaAsset> {
  assertSupabase();

  const mime = input.mimeType.toLowerCase().split(";")[0]!.trim();
  const allowed = MIME_EXTENSIONS[mime];
  if (!allowed) {
    throw AppError.unsupportedMediaType(`Unsupported file type "${mime || "unknown"}". Allowed: ${Object.keys(MIME_EXTENSIONS).join(", ")}.`);
  }

  const ext = extensionOf(input.filename);
  if (!ext || !allowed.includes(ext)) {
    throw AppError.badRequest(`File extension ".${ext || "?"}" does not match its content type "${mime}".`);
  }

  const max = getEnv().MEDIA_MAX_BYTES;
  if (input.bytes.byteLength === 0) throw AppError.badRequest("File is empty");
  if (input.bytes.byteLength > max) {
    throw AppError.payloadTooLarge(`File is too large (max ${Math.round(max / (1024 * 1024))} MiB).`);
  }

  // Server-generated object path — the uploaded filename is never trusted.
  const now = new Date();
  const key = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext}`;

  // Upload AS the administrator → storage.objects RLS policy decides.
  const scoped = createScopedSupabase(accessToken);
  const { error } = await scoped.storage.from(BUCKET).upload(key, input.bytes, {
    contentType: mime,
    cacheControl: "3600",
    upsert: false, // never silently replace an existing object
  });
  if (error) {
    logger.error("media_upload_failed", { message: error.message.slice(0, 200) });
    if (error.message.toLowerCase().includes("row-level security") || error.message.toLowerCase().includes("new row violates")) {
      throw AppError.forbidden("You are not allowed to upload media.");
    }
    throw AppError.serviceUnavailable("Upload failed. Please try again.");
  }

  const publicUrl = `${process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;

  const sb = supabaseService();
  const { data, error: dbError } = await sb
    .from("media_assets")
    .insert({
      file_name: input.filename.slice(0, 200),
      storage_path: key,
      public_url: publicUrl,
      mime_type: mime,
      size_bytes: input.bytes.byteLength,
      alt_text: input.altText ?? null,
      uploaded_by: actor.userId,
    })
    .select("*")
    .single();
  const row = dbGuard(dbError, data) as Record<string, unknown>;

  await audit(actor, "MEDIA_UPLOAD", "media-asset", String(row.id ?? key), {
    mimeType: mime,
    sizeBytes: input.bytes.byteLength,
    storagePath: key,
  });

  return row as MediaAsset;
}

export async function deleteMedia(id: string, accessToken: string | null, actor: AdminActor): Promise<{ removed: true }> {
  assertSupabase();
  const sb = supabaseService();
  const { data, error } = await sb.from("media_assets").select("*").eq("id", id).maybeSingle();
  const row = dbGuard(error, data) as Record<string, unknown> | null;
  if (!row) throw AppError.notFound("Media asset not found");

  const path = row.storage_path as string | null;
  if (path) {
    // Deletion also runs under the administrator's JWT (media_admin_delete).
    if (!accessToken) throw AppError.unauthorized("Authentication required");
    const scoped = createScopedSupabase(accessToken);
    const { error: storageError } = await scoped.storage.from(BUCKET).remove([path]);
    if (storageError) {
      logger.warn("media_storage_delete_failed", { message: storageError.message.slice(0, 200) });
      throw AppError.forbidden("You are not allowed to delete media.");
    }
  }

  const del = await sb.from("media_assets").delete().eq("id", id);
  dbGuard(del.error, del.data);
  await audit(actor, "MEDIA_DELETE", "media-asset", id, { storagePath: path });
  return { removed: true };
}

