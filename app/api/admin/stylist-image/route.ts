import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_BYTES = 6 * 1024 * 1024;
const stylistSchema = z.string().uuid();

function detectImage(bytes: Uint8Array) {
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (jpeg) return "jpg";
  if (png) return "png";
  if (webp) return "webp";
  return null;
}

export async function POST(req: Request) {
  try {
    const { user } = await requireAdmin();
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Image upload is too large." }, { status: 413 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const stylistResult = stylistSchema.safeParse(String(form.get("stylist_id") || "").trim());
    if (!stylistResult.success) return NextResponse.json({ error: "A valid stylist is required." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Please choose an image." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectImage(bytes);
    if (!detected) return NextResponse.json({ error: "The uploaded file is not a valid JPG, PNG or WebP image." }, { status: 400 });

    const admin = createAdminClient();
    const stylistId = stylistResult.data;
    const { data: stylist, error: stylistError } = await admin.from("stylists").select("id").eq("id", stylistId).maybeSingle();
    if (stylistError) throw stylistError;
    if (!stylist) return NextResponse.json({ error: "Stylist not found." }, { status: 404 });

    const path = `${stylistId}/${crypto.randomUUID()}.${detected}`;
    const contentType = detected === "png" ? "image/png" : detected === "webp" ? "image/webp" : "image/jpeg";
    const { error: uploadError } = await admin.storage.from("stylist-images").upload(path, bytes, {
      contentType,
      upsert: false,
      cacheControl: "31536000",
    });
    if (uploadError) throw uploadError;

    const { data } = admin.storage.from("stylist-images").getPublicUrl(path);
    const imageUrl = data.publicUrl;
    const { error: updateError } = await admin.from("stylists").update({ image_url: imageUrl }).eq("id", stylistId);
    if (updateError) {
      await admin.storage.from("stylist-images").remove([path]);
      throw updateError;
    }

    await admin.from("audit_logs").insert({ admin_id: user.id, action: "update", entity: "stylist_image", entity_id: stylistId, new_data: { image_url: imageUrl } });
    return NextResponse.json({ image_url: imageUrl });
  } catch (error: any) {
    const message = error?.message || "Unable to upload stylist photo.";
    if (message === "FORBIDDEN") return NextResponse.json({ error: message }, { status: 403 });
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: message }, { status: 401 });
    console.error("Stylist image upload failed", error);
    return NextResponse.json({ error: "Unable to upload stylist photo." }, { status: 500 });
  }
}
