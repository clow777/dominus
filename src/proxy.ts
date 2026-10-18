import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/server/auth/cookie-name";

/**
 * Atalho barato: quem tem cookie de sessão não precisa ver a landing nem /verificacao.
 * A validade da sessão e o status do KYC são decididos nas páginas (/dashboard, /kyc),
 * que redirecionam para o destino correto.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/verificacao"] };
