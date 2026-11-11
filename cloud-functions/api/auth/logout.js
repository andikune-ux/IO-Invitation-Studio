import { logout } from "../../_lib/auth.js";
export async function onRequestPost({ request }) {
  return logout(request);
}
