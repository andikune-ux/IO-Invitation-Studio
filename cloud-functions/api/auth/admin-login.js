import { readJson } from "../../_lib/http.js";
import { adminLogin } from "../../_lib/auth.js";
export async function onRequestPost({ request }) {
  return adminLogin(request, await readJson(request));
}
