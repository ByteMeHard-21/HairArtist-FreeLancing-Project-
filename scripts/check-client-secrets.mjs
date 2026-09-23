import { readdir, readFile } from "node:fs/promises";
const keys=["SUPABASE_SERVICE_ROLE_KEY","BOOKING_HMAC_SECRET","VERIFICATION_TOKEN","WHATSAPP_NOTIFICATION_TOKEN"];
async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=dir+"/"+entry.name;
  if(entry.isDirectory())await scan(path);
  else if(/\.(js|map)$/.test(entry.name)){
    const content=await readFile(path,"utf8");
    for(const key of keys){const value=process.env[key];if(value&&value.length>10&&content.includes(value))throw new Error("Private server value found in client output: "+key);}
  }
}}
await scan(".next/static");
console.log("PASS: configured private server values are absent from browser JavaScript and source maps.");