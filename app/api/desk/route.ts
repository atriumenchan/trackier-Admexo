import {
  cleanupDuplicateAffiliates,
  deleteAdvertiser,
  deleteAffiliate,
  deleteSyncSource,
  importFeed,
  regenerateToken,
  rotateApiToken,
  runSync,
  saveAccess,
  saveAdvertiser,
  saveAffiliate,
  saveOffer,
  saveSettings,
  saveSyncSource,
} from "@/lib/actions";

const actions = {
  saveAffiliate,
  deleteAffiliate,
  cleanupDuplicateAffiliates,
  saveAdvertiser,
  deleteAdvertiser,
  regenerateToken,
  rotateApiToken,
  saveSettings,
  saveOffer,
  saveAccess,
  saveSyncSource,
  deleteSyncSource,
  runSync,
  importFeed,
} as const;

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("_action") || "");
  const action = actions[name as keyof typeof actions];
  if (!action) return new Response("Unknown action", { status: 400 });
  await action(form);
  return new Response("Done", { status: 200 });
}
