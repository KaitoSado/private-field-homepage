const DEFAULT_AVATAR_BUCKET = "avatars";
const DEFAULT_POST_MEDIA_BUCKET = "post-media";
const DEFAULT_SCENE_MODEL_BUCKET = "scene-models";

export function getAvatarBucket() {
  return process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || DEFAULT_AVATAR_BUCKET;
}

export function getPostMediaBucket() {
  return process.env.NEXT_PUBLIC_SUPABASE_POST_MEDIA_BUCKET || DEFAULT_POST_MEDIA_BUCKET;
}

export function getSceneModelBucket() {
  return process.env.NEXT_PUBLIC_SUPABASE_SCENE_MODEL_BUCKET || DEFAULT_SCENE_MODEL_BUCKET;
}

export async function uploadPublicFile({ supabase, bucket, userId, file, folder }) {
  const safeName = normalizeFilename(file.name || "upload");
  const extension = safeName.includes(".") ? safeName.split(".").pop() : "";
  const key = `${userId}/${folder}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

  const { error } = await supabase.storage.from(bucket).upload(key, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}

function normalizeFilename(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
