// Clerk catch-all route. Handles /sign-up plus all Clerk sub-paths
// (/sign-up/verify-email-address, /sign-up/sso-callback, etc.).
//
// The previous shim at /sign-up redirected to /signup, which redirected
// back — same loop pattern as the sign-in fix above.
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-[#0a0a0a] px-4 py-12">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/feed"
      />
    </div>
  )
}
