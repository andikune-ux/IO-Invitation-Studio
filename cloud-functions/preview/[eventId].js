import { getStore } from "@edgeone/pages-blob";
import { validEventId } from "../../_lib/http.js";
const escapeHtml=value=>String(value||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export async function onRequestGet({request,params}){
 const eventId=params?.eventId;
 if(!validEventId(eventId))return new Response("Undangan tidak ditemukan.",{status:404});
 try{
  const store=getStore("io-invitation-media");
  const data=await store.get(`events/${eventId}/invitation.json`,{type:"json",consistency:"strong"});
  if(!data||data.status!=="published")return new Response("Undangan belum diterbitkan.",{status:404});
  const origin=new URL(request.url).origin;
  const target=new URL("/guest.html?event="+encodeURIComponent(eventId),origin).href;
  const imageKey=data.media?.hero||data.media?.cover;
  const image=imageKey?new URL("/api/media?key="+encodeURIComponent(imageKey),origin).href:"";
  const title=escapeHtml(data.title||"Undangan Digital");
  const description=escapeHtml(data.opening||"Anda diundang untuk menghadiri acara kami.");
  const imageTag=image?`<meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:secure_url" content="${escapeHtml(image)}"><meta name="twitter:image" content="${escapeHtml(image)}">`:"";
  const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${escapeHtml(request.url)}">${imageTag}<meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=${escapeHtml(target)}"><link rel="canonical" href="${escapeHtml(target)}"></head><body><p>Membuka undangan… <a href="${escapeHtml(target)}">Lanjutkan</a></p><script>location.replace(${JSON.stringify(target)})</script></body></html>`;
  return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"}});
 }catch{return new Response("Undangan belum dapat dimuat.",{status:503})}
}