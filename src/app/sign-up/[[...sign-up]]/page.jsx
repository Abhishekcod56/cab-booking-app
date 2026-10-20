
import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <Suspense
        fallback={
          <p className="text-gray-500">
            Loading sign up...
          </p>
        }
      >
        <SignUp
          forceRedirectUrl="/login"
          signInUrl="/login"
        />
      </Suspense>
    </main>
  );
}
