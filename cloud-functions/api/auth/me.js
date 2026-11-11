import { sessionInfo } from "../../_lib/auth.js";
export async function onRequestGet({ request }) {
  return sessionInfo(request);
}
