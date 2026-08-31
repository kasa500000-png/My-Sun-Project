import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_STAGING_URL;
const anonKey = process.env.SUPABASE_STAGING_ANON_KEY;
const serviceKey = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY;
const bucket = process.env.FIT_DIET_IMAGE_BUCKET || "fit-diet-images";

if (!url || !anonKey || !serviceKey) {
  console.error("SUPABASE_STAGING_URL, SUPABASE_STAGING_ANON_KEY and SUPABASE_STAGING_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const suffix = randomUUID();
const password = `Smoke-${suffix}-Aa1!`;
const emails = [
  `mysun-smoke-${suffix}@example.com`,
  `mysun-smoke-isolation-${suffix}@example.com`,
];
const createdUserIds = [];
const storagePaths = [];

async function createConfirmedUser(email) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  assert.ok(data.user?.id, "created user must have an id");
  createdUserIds.push(data.user.id);
  return data.user.id;
}

async function signedInClient(email) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  assert.ok(data.session?.access_token, "staging login must return a session");
  return client;
}

async function run() {
  console.log("[1/9] create isolated staging users");
  const userId = await createConfirmedUser(emails[0]);
  await createConfirmedUser(emails[1]);
  const user = await signedInClient(emails[0]);
  const otherUser = await signedInClient(emails[1]);

  console.log("[2/9] settings create/update/read through RLS");
  const settingsInsert = await user.from("fit_user_settings").insert({
    user_id: userId,
    weekly_goal: 4,
    favorite_exercise_ids: ["squat"],
    gender: "",
    activity_level: "moderate",
  }).select("*").single();
  if (settingsInsert.error) throw settingsInsert.error;
  const settingsUpdate = await user.from("fit_user_settings")
    .update({ weekly_goal: 5 })
    .eq("user_id", userId)
    .select("weekly_goal")
    .single();
  if (settingsUpdate.error) throw settingsUpdate.error;
  assert.equal(settingsUpdate.data.weekly_goal, 5);

  console.log("[3/9] workout session and set CRUD");
  const sessionInsert = await user.from("fit_workout_sessions").insert({
    user_id: userId,
    workout_date: new Date().toISOString().slice(0, 10),
    routine_name: "staging-smoke",
    duration_minutes: 30,
    memo: "create",
  }).select("id").single();
  if (sessionInsert.error) throw sessionInsert.error;
  const sessionId = sessionInsert.data.id;

  const setInsert = await user.from("fit_set_logs").insert({
    session_id: sessionId,
    user_id: userId,
    exercise_id: "squat",
    set_number: 1,
    weight: 40,
    reps: 10,
  }).select("id").single();
  if (setInsert.error) throw setInsert.error;

  const sessionUpdate = await user.from("fit_workout_sessions")
    .update({ memo: "updated" })
    .eq("id", sessionId)
    .select("memo")
    .single();
  if (sessionUpdate.error) throw sessionUpdate.error;
  assert.equal(sessionUpdate.data.memo, "updated");

  console.log("[4/9] verify cross-user RLS isolation");
  const isolatedRead = await otherUser.from("fit_workout_sessions")
    .select("id")
    .eq("id", sessionId);
  if (isolatedRead.error) throw isolatedRead.error;
  assert.equal(isolatedRead.data.length, 0, "another user must not read the session");

  console.log("[5/9] private Storage upload and signed URL");
  const imagePath = `${userId}/${new Date().toISOString().slice(0, 10)}/smoke-${suffix}.png`;
  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nO0AAAAASUVORK5CYII=",
    "base64",
  );
  const directUpload = await user.storage.from(bucket).upload(`forbidden/${suffix}.png`, onePixelPng, {
    contentType: "image/png",
  });
  assert.ok(directUpload.error, "authenticated clients must not upload directly to the private bucket");

  const serviceUpload = await service.storage.from(bucket).upload(imagePath, onePixelPng, {
    contentType: "image/png",
    upsert: false,
  });
  if (serviceUpload.error) throw serviceUpload.error;
  storagePaths.push(imagePath);
  const signed = await service.storage.from(bucket).createSignedUrl(imagePath, 60);
  if (signed.error) throw signed.error;
  assert.match(signed.data.signedUrl, /^https:\/\//);

  console.log("[6/9] diet meal, food and nutrition-goal CRUD");
  const mealInsert = await user.from("fit_diet_meal_logs").insert({
    user_id: userId,
    meal_date: new Date().toISOString().slice(0, 10),
    meal_slot: "lunch",
    entry_name: "staging-smoke",
    image_path: imagePath,
    image_url: null,
  }).select("id, image_path").single();
  if (mealInsert.error) throw mealInsert.error;
  assert.equal(mealInsert.data.image_path, imagePath);

  const foodInsert = await user.from("fit_diet_food_items").insert({
    meal_log_id: mealInsert.data.id,
    user_id: userId,
    name: "현미밥",
    portion: "1인분",
    calories: 300,
    carbs: 60,
    protein: 6,
    fat: 2,
    sort_order: 1,
  }).select("id").single();
  if (foodInsert.error) throw foodInsert.error;

  const goalUpsert = await user.from("fit_nutrition_goals").upsert({
    user_id: userId,
    goal_type: "maintain",
    target_calories: 2000,
    target_protein: 100,
  }).select("goal_type").single();
  if (goalUpsert.error) throw goalUpsert.error;
  assert.equal(goalUpsert.data.goal_type, "maintain");

  console.log("[7/9] persistent AI quota RPC");
  const quota = await service.rpc("consume_fit_ai_analysis_quota", {
    p_user_id: userId,
    p_daily_limit: 20,
    p_minute_limit: 3,
  });
  if (quota.error) throw quota.error;
  const quotaRow = Array.isArray(quota.data) ? quota.data[0] : quota.data;
  assert.equal(quotaRow.allowed, true);
  assert.equal(quotaRow.minute_remaining, 2);

  console.log("[8/9] delete paths and rows");
  const mealDelete = await user.from("fit_diet_meal_logs").delete().eq("id", mealInsert.data.id);
  if (mealDelete.error) throw mealDelete.error;
  const workoutDelete = await user.from("fit_workout_sessions").delete().eq("id", sessionId);
  if (workoutDelete.error) throw workoutDelete.error;
  const settingsDelete = await user.from("fit_user_settings").delete().eq("user_id", userId);
  if (settingsDelete.error) throw settingsDelete.error;

  console.log("[9/9] final assertions");
  const deletedSession = await user.from("fit_workout_sessions").select("id").eq("id", sessionId);
  if (deletedSession.error) throw deletedSession.error;
  assert.equal(deletedSession.data.length, 0);

  console.log("Supabase staging CRUD smoke: PASS");
}

try {
  await run();
} finally {
  if (storagePaths.length > 0) {
    const cleanup = await service.storage.from(bucket).remove(storagePaths);
    if (cleanup.error) console.error("Storage cleanup failed:", cleanup.error.message);
  }
  for (const userId of createdUserIds) {
    const cleanup = await service.auth.admin.deleteUser(userId);
    if (cleanup.error) console.error(`User cleanup failed (${userId}):`, cleanup.error.message);
  }
}
