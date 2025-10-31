import { GradientBackground } from "@/components/gradient";
import { Social } from "@/components/social";
import { env } from "@/env.mjs";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your account to continue.",
};

const LoginPage = () => {
  return (
    <main className="overflow-hidden bg-gray-50">
      <GradientBackground />
      <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
        <div className="flex flex-col">
          <div className="w-full max-w-md rounded-xl bg-white shadow-md ring-1 ring-black/5">
            <div className="p-7 sm:p-11">
              <div className="flex items-center justify-center">
                <Link href={`${env.NEXT_PUBLIC_MARKETING_URL}`} title="Home">
                  <img
                    src="/devfleet-logo.png"
                    alt="DevFleet Logo"
                    className="h-18 overflow-visible"
                  />
                </Link>
              </div>
              <h1 className="mt-8 text-base/6 font-medium">Welcome!</h1>
              <p className="mt-1 text-sm/5 text-gray-600">
                Sign in to your account to continue.
              </p>

              <div className="mt-8 space-y-3">
                <Suspense>
                  <Social />
                </Suspense>
              </div>
            </div>
          </div>
          <div className="w-full max-w-md text-balance px-8 pt-4 text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
            By clicking continue, you agree to our{" "}
            <a href={`${env.NEXT_PUBLIC_MARKETING_URL}/terms-of-service`}>
              Terms of Service
            </a>{" "}
            and{" "}
            <a href={`${env.NEXT_PUBLIC_MARKETING_URL}/privacy`}>
              Privacy Policy
            </a>
            .
          </div>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
