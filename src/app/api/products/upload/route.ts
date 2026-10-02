import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/db";

/**
 * Upload van een productafbeelding naar Supabase Storage (bucket "product-images").
 * Alleen toegankelijk na inloggen in /admin (zie src/proxy.ts: POST onder /api/products).
 * Maximaal 4 MB: Vercel weigert request-bodies boven ~4,5 MB.
 */
const BUCKET = "product-images";
const MAX_BYTES = 4 * 1024 * 1024;

function detectImageType(bytes: Uint8Array): { contentType: string; extension: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { contentType: "image/png", extension: "png" };
  }
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

export async function POST(request: Request) {
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Geen bestand ontvangen." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "De afbeelding is te groot (maximaal 4 MB)." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) {
    return NextResponse.json({ error: "Alleen JPG-, PNG- of WebP-afbeeldingen zijn toegestaan." }, { status: 415 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Uploaden is niet beschikbaar: Supabase is niet geconfigureerd." }, { status: 503 });
  }

  const path = `${randomUUID()}.${type.extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: type.contentType,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    console.error("[api/products/upload] Upload mislukt:", error);
    return NextResponse.json({ error: "De afbeelding kon niet worden geüpload." }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
