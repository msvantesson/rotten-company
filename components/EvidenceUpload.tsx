const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  setLoading(false);
  setError("User not authenticated.");
  return;
}

// ✅ Debug log to confirm user ID
console.log("Authenticated user ID:", user.id);

const safeName = sanitizeFileName(file.name);
const filePath = `${entityType}/${entityId}/${Date.now()}-${safeName}`;

const { error: uploadError } = await supabase.storage
  .from("evidence")
  .upload(filePath, file, {
    upsert: false,
});

if (uploadError) {
  console.error("Upload error:", uploadError);
  setLoading(false);
  setError("Upload failed.");
  return;
}

// ✅ Debug log to confirm insert payload
console.log("Insert payload:", {
  entity_type: entityType,
  entity_id: entityId,
  title,
  summary,
  file_path: filePath,
  user_id: user.id,
});

const { error: insertError } = await supabase.from("evidence").insert([
  {
    entity_type: entityType,
    entity_id: entityId,
    title,
    summary,
    file_path: filePath,
    user_id: user.id,
  },
]);

if (insertError) {
  console.error("Insert error:", insertError);
  setLoading(false);
  setError("Database insert failed.");
  return;
}
