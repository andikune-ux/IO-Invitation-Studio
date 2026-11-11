import { readJson } from "../../_lib/http.js";
import { createEventAdmin } from "../../_lib/auth.js";
export async function onRequestPost({ request }) {
  return createEventAdmin(request, await readJson(request));
}
