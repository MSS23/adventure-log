// Clerk catch-all route. Handles /sign-in plus all Clerk sub-paths
// (/sign-in/factor-one, /sign-in/factor-two, /sign-in/sso-callback, etc.).
//
// Mounting <SignIn /> as a catch-all is the supported Clerk + Next.js App
// Router pattern. The previous shim at /sign-in redirected to /login, which
// in turn redirected back to /sign-in — an infinite loop that made the entire
// app un-signupable.
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-[#0a0a0a] px-4 py-12">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/feed"
      />
    </div>
  )
}
