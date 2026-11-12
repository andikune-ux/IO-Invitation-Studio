import { getStore } from "@edgeone/pages-blob";
import { createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { json, readJson, safeText, validEventId } from "../_lib/http.js";

const STORE = "io-invitation-media";
const digest = value => createHash("sha256").update(value).digest("hex");
const equal = (a,b) => { const x=Buffer.from(String(a||"")),y=Buffer.from(String(b||"")); return x.length===y.length && timingSafeEqual(x,y); };
const validGuestId = value => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
const sameOrigin = request => {
  const origin=request.headers.get("Origin");
  if(!origin)return true;
  try{return new URL(origin).origin===new URL(request.url).origin}catch{return false}
};
async function publishedEvent(db,eventId){
  const [meta,invitation]=await Promise.all([
    db.get(`events/${eventId}/meta.json`,{type:"json",consistency:"strong"}),
    db.get(`events/${eventId}/invitation.json`,{type:"json",consistency:"strong"})
  ]);
  return Boolean(meta && meta.status!=="archived" && invitation && invitation.status==="published");
}
export async function onRequestGet({request}){
  const eventId=new URL(request.url).searchParams.get("eventId")||"";
  if(!validEventId(eventId))return json({error:"ID acara tidak valid."},400);
  try{
    const db=getStore(STORE);
    if(!await publishedEvent(db,eventId))return json({error:"Undangan belum tersedia."},404);
    const {blobs=[]}=await db.list({prefix:`events/${eventId}/guestbook/`,consistency:"strong"});
    const entries=(await Promise.all(blobs.map(async({key})=>db.get(key,{type:"json",consistency:"strong"}))))
      .filter(Boolean).sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0)).slice(0,100)
      .map(({name,message,rsvp,createdAt})=>({name,message,rsvp,createdAt}));
    return json({ok:true,entries});
  }catch{return json({error:"Buku tamu belum dapat dimuat."},503)}
}
export async function onRequestPost({request}){
  if(!sameOrigin(request))return json({error:"Origin tidak diizinkan."},403);
  const body=await readJson(request)||{},eventId=body.eventId||"",guestId=body.guestId||null;
  const name=safeText(body.name,100),message=safeText(body.message,1000),rsvp=body.rsvp;
  if(!validEventId(eventId)||!name||!["hadir","tidak_hadir"].includes(rsvp))return json({error:"Nama dan status kehadiran wajib diisi."},400);
  if(guestId&&!validGuestId(guestId))return json({error:"ID tamu tidak valid."},400);
  try{
    const db=getStore(STORE);
    if(!await publishedEvent(db,eventId))return json({error:"Undangan belum tersedia."},404);
    if(guestId){
      const key=`events/${eventId}/guests/${guestId}.json`;
      const guest=await db.get(key,{type:"json",consistency:"strong"});
      if(!guest||guest.linkActive===false)return json({error:"Tautan tamu tidak aktif."},403);
      const token=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
      if(guest.tokenHash&&(!token||!equal(guest.tokenHash,digest(token))))return json({error:"Token tamu tidak valid."},403);
      guest.rsvp=rsvp;guest.rsvpUpdatedAt=new Date().toISOString();await db.setJSON(key,guest);
    }
    const entry={id:randomUUID(),eventId,name:guestId?(await db.get(`events/${eventId}/guests/${guestId}.json`,{type:"json",consistency:"strong"})).name:name,message,rsvp,createdAt:new Date().toISOString()};
    await db.setJSON(`events/${eventId}/guestbook/${entry.id}.json`,entry);
    const {blobs=[]}=await db.list({prefix:`events/${eventId}/guestbook/`,consistency:"strong"});
    const entries=(await Promise.all(blobs.map(async({key})=>db.get(key,{type:"json",consistency:"strong"}))))
      .filter(Boolean).sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0)).slice(0,100)
      .map(({name,message,rsvp,createdAt})=>({name,message,rsvp,createdAt}));
    return json({ok:true,entries},201);
  }catch{return json({error:"Konfirmasi kehadiran gagal disimpan."},503)}
}