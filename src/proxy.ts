import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (request.nextUrl.pathname !== "/admin/login") return NextResponse.redirect(new URL("/admin/login", request.url));
    return response;
  }
  const auth = createServerClient(url, key, {
    cookieOptions: { httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV === "production", path:"/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: values => {
        values.forEach(({ name,value }) => request.cookies.set(name,value));
        response = NextResponse.next({ request });
        values.forEach(({ name,value,options }) => response.cookies.set(name,value,options));
      },
    },
  });
  const finish = (destination?: string) => {
    if (destination) {
      const redirected = NextResponse.redirect(new URL(destination, request.url));
      response.cookies.getAll().forEach(cookie => redirected.cookies.set(cookie));
      response = redirected;
    }
    response.headers.set("Cache-Control","private, no-store");
    response.headers.set("X-Robots-Tag","noindex, nofollow");
    response.headers.set("Referrer-Policy","same-origin");
    return response;
  };
  // Callback must exchange its PKCE code before authentication can be checked.
  const path = request.nextUrl.pathname;
  if (path === "/admin/callback") return finish();
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user) return finish(path === "/admin/login" ? undefined : "/admin/login");
  const membership = await auth.from("admin_users").select("role,is_active").eq("user_id",data.user.id).maybeSingle();
  if (membership.error) return new NextResponse("Studio access is temporarily unavailable.", { status:503, headers:{"Cache-Control":"no-store"} });
  if (!membership.data?.is_active || membership.data.role !== "ADMIN") return finish(path === "/admin/unauthorized" ? undefined : "/admin/unauthorized");
  return finish();
}
export const config = { matcher: ["/admin/:path*"] };
