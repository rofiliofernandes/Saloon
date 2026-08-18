import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function detectImage(bytes: Uint8Array) {
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return jpeg ? "jpg" : png ? "png" : webp ? "webp" : null;
}

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  let stylistId: string | null = null;
  let uploadedPath: string | null = null;

  try {
    const { user } = await requireAdmin();
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 6 * 1024 * 1024) return NextResponse.json({ error: "Image upload is too large." }, { status: 413 });
    const form = await req.formData();
    const admin = createAdminClient();

    const name = cleanText(form.get("name"));
    const category = cleanText(form.get("category"));
    const bio = cleanText(form.get("bio"));
    const file = form.get("file");

    let serviceIds: string[] = [];
    try {
      const parsed = JSON.parse(String(form.get("service_ids") || "[]"));
      if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) {
        throw new Error("service_ids must be an array of IDs.");
      }
      serviceIds = parsed;
    } catch {
      return NextResponse.json({ error: "Invalid service selection." }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Stylist name is required." }, { status: 400 });
    }

    if (file instanceof File) {
      if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Use JPG, PNG or WebP images." }, { status: 400 });
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });
    }

    if (serviceIds.length > 0) {
      const { data: services, error: servicesError } = await admin
        .from("services")
        .select("id")
        .in("id", serviceIds)
        .eq("active", true)
        .is("deleted_at", null);

      if (servicesError) throw servicesError;

      const validIds = new Set((services ?? []).map((service) => service.id));
      if (serviceIds.some((id) => !validIds.has(id))) {
        return NextResponse.json(
          { error: "One or more selected services are unavailable." },
          { status: 400 }
        );
      }
    }

    const { data: stylist, error: stylistError } = await admin
      .from("stylists")
      .insert({
        name,
        category: category || null,
        bio: bio || null,
        active: true,
      })
      .select("id,name,bio,category,image_url,active,deleted_at")
      .single();

    if (stylistError) throw stylistError;
    stylistId = stylist.id;

    let imageUrl: string | null = null;

    if (file instanceof File) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extension = detectImage(bytes);
      if (!extension) throw new Error("INVALID_IMAGE");
      uploadedPath = `${stylistId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await admin.storage
        .from("stylist-images")
        .upload(uploadedPath, bytes, {
          contentType: extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg",
          upsert: false,
          cacheControl: "31536000",
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = admin.storage.from("stylist-images").getPublicUrl(uploadedPath);
      imageUrl = publicUrl.publicUrl;

      const { error: imageUpdateError } = await admin
        .from("stylists")
        .update({ image_url: imageUrl })
        .eq("id", stylistId);

      if (imageUpdateError) throw imageUpdateError;
    }

    if (serviceIds.length > 0) {
      const relationships = serviceIds.map((serviceId) => ({
        stylist_id: stylistId,
        service_id: serviceId,
      }));

      const { error: relationError } = await admin
        .from("stylist_services")
        .insert(relationships);

      if (relationError) throw relationError;
    }

    const finalStylist = {
      ...stylist,
      image_url: imageUrl,
    };

    await admin.from("audit_logs").insert({
      admin_id: user.id,
      action: "create",
      entity: "stylists",
      entity_id: stylistId,
      new_data: finalStylist,
    });

    return NextResponse.json({ rows: [finalStylist] }, { status: 201 });
  } catch (error: any) {
    if (stylistId) {
      try {
        const admin = createAdminClient();
        if (uploadedPath) {
          await admin.storage.from("stylist-images").remove([uploadedPath]);
        }
        await admin.from("stylist_services").delete().eq("stylist_id", stylistId);
        await admin.from("stylists").delete().eq("id", stylistId);
      } catch {
        // Preserve the original error for the UI.
      }
    }

    const message = error?.message || "Unable to create stylist.";
    if (message === "FORBIDDEN") return NextResponse.json({ error: message }, { status: 403 });
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "INVALID_IMAGE") return NextResponse.json({ error: "The uploaded file is not a valid JPG, PNG or WebP image." }, { status: 400 });
    console.error("Stylist creation failed", error);
    return NextResponse.json({ error: "Unable to create stylist." }, { status: 500 });
  }
}
