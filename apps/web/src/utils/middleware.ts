import { type NextRequest, NextResponse } from "next/server";
import { SafeError } from "@/utils/error";
import { ZodError } from "zod";
import { getSession } from "./auth";

export interface MiddlewareOptions {
  allowOrgAdmins?: boolean;
}

export type NextHandler<T extends NextRequest = NextRequest> = (
  req: T,
  context: { params: Promise<Record<string, string>> }
) => Promise<Response>;

// Extended request type with validated account info
export interface RequestWithAuth extends NextRequest {
  auth: {
    userId: string;
  };
}

// Higher-order middleware factory that handles common error logic
function withMiddleware<T extends NextRequest>(
  handler: NextHandler<T>,
  middleware?: (
    req: NextRequest,
    options?: MiddlewareOptions
  ) => Promise<T | Response>,
  options?: MiddlewareOptions
): NextHandler {
  return async (req, context) => {
    try {
      // Apply middleware if provided
      let enhancedReq = req;
      if (middleware) {
        const middlewareResult = await middleware(req, options);

        // If middleware returned a Response, return it directly
        if (middlewareResult instanceof Response) {
          return middlewareResult;
        }

        // Otherwise, continue with the enhanced request
        enhancedReq = middlewareResult;
      }

      // Execute the handler with the (potentially) enhanced request
      return await handler(enhancedReq as T, context);
    } catch (error) {
      // redirects work by throwing an error. allow these
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        throw error;
      }

      if (error instanceof ZodError) {
        console.error("Error for url", { error, url: req.url });
        return NextResponse.json(
          { error: { issues: error.issues }, isKnownError: true },
          { status: 400 }
        );
      }

      // const apiError = checkCommonErrors(error, req.url);
      // if (apiError) {
      //   await logErrorToPosthog("api", req.url, apiError.type);

      //   return NextResponse.json(
      //     { error: apiError.message, isKnownError: true },
      //     { status: apiError.code }
      //   );
      // }

      if (isErrorWithConfigAndHeaders(error)) {
        error.config.headers = undefined;
      }

      if (error instanceof SafeError) {
        return NextResponse.json(
          { error: error.safeMessage, isKnownError: true },
          { status: 400 }
        );
      }

      console.error("Unhandled error", {
        error: error instanceof Error ? error.message : error,
        url: req.url,
      });
      // captureException(error, { extra: { url: req.url } });

      return NextResponse.json(
        { error: "An unexpected error occurred" },
        { status: 500 }
      );
    }
  };
}

async function authMiddleware(
  req: NextRequest
): Promise<RequestWithAuth | Response> {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", isKnownError: true },
      { status: 401 }
    );
  }

  // Create a new request with auth info
  const authReq = req.clone() as RequestWithAuth;
  authReq.auth = { userId: session.user.id };

  return authReq;
}

// Public middlewares that build on the common infrastructure
export function withError(
  handler: NextHandler,
  options?: MiddlewareOptions
): NextHandler {
  return withMiddleware(handler, undefined, options);
}

export function withAuth(handler: NextHandler<RequestWithAuth>): NextHandler {
  return withMiddleware(handler, authMiddleware);
}

function isErrorWithConfigAndHeaders(
  error: unknown
): error is { config: { headers: unknown } } {
  return (
    typeof error === "object" &&
    error !== null &&
    "config" in error &&
    "headers" in (error as { config: any }).config
  );
}
