import { json } from "../../_lib/http.js";
export async function onRequestPost() {
  return json({ error: "Login username/password Admin sudah dihentikan. Minta tautan akses kepada Owner." }, 410);
}
