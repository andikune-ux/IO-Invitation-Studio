import { ownerLogin } from "../../_lib/auth.js";
export async function onRequestPost({ request, env }) {
  return ownerLogin(request, env);
}
