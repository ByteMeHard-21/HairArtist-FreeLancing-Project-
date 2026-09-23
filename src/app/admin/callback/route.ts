import { authClient } from "@/lib/booking-server";
export async function GET(request:Request){
  const code=new URL(request.url).searchParams.get("code");
  let destination="/admin/login";
  if(code){
    const auth=await authClient();
    const {error}=await auth.auth.exchangeCodeForSession(code);
    if(!error)destination+="?recovery=1";
  }
  // Relative Location preserves the actual browser host, including local aliases.
  // The destination is fixed; neither query parameters nor forwarded hosts control it.
  return new Response(null,{status:303,headers:{Location:destination,"Cache-Control":"private, no-store","Referrer-Policy":"same-origin"}});
}