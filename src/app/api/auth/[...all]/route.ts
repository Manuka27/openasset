import { getAuth } from "@/lib/auth";

export function POST(request: Request) {
  const path = new URL(request.url).pathname;
  if (path !== "/api/auth/sign-in/email" && path !== "/api/auth/sign-out") {
    return new Response(null, { status: 404 });
  }
  return getAuth().handler(request);
}
