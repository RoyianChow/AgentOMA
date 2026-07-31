import { NextResponse, type NextRequest } from "next/server";

import { loadSandboxEnv } from "./env/server";
import { lifecycleState } from "./lifecycle/state";
import { responseHeaders } from "./security/headers";

export function proxy(request: NextRequest): NextResponse {
  try {
    // The wrapper validates startup before Next initializes. Runtime requests
    // must still reach the lifecycle guard so expiry can become a marked 410.
    const env = loadSandboxEnv({ phase: "startup", allowExpired: true });
    const lifecycle = lifecycleState(env);
    if (request.nextUrl.origin !== env.origin) {
      return new NextResponse("SANDBOX_ACCESS_DENIED:ORIGIN", {
        status: 421,
        headers: responseHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
      });
    }
    if (lifecycle.state === "EXPIRED") {
      return new NextResponse("SANDBOX_EXPIRED", {
        status: 410,
        headers: responseHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
      });
    }
    if (lifecycle.state !== "LOCAL_ACTIVE") {
      return new NextResponse("SANDBOX_DISABLED", {
        status: 503,
        headers: responseHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
      });
    }
    return NextResponse.next();
  } catch {
    return new NextResponse("SANDBOX_UNCONFIGURED", {
      status: 503,
      headers: responseHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
    });
  }
}

export const config = {
  matcher: ["/:path*"],
};
