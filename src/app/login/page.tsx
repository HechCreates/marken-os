import { Suspense } from "react"
import LoginForm from "./login-form"

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}

// Matches the real form's frame so the swap doesn't shift the layout.
function LoginSkeleton() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-6 py-12">
      <div className="w-full max-w-[380px]">
        <header className="mb-7">
          <h1 className="text-title1 font-semibold text-label">Marken OS</h1>
          <p className="mt-1.5 text-subhead text-label-secondary">
            Sign in to your workspace
          </p>
        </header>
        <div
          className="h-[268px] rounded-[14px] border border-separator bg-card shadow-card"
          aria-hidden="true"
        />
      </div>
    </main>
  )
}
