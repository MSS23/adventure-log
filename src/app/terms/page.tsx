import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-muted/50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Terms of Service
              </h1>
              <p className="text-muted-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Welcome to Adventure Log</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 font-medium">
                By using Adventure Log, you agree to these terms. Please read them carefully.
              </p>
            </div>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Adventure Log (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
              <p>
                Permission is granted to temporarily download one copy of Adventure Log for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>modify or copy the materials</li>
                <li>use the materials for any commercial purpose or for any public display</li>
                <li>attempt to reverse engineer any software contained in Adventure Log</li>
                <li>remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Content</h2>
              <p>
                You retain ownership of any content you upload to Adventure Log. By uploading content, you grant us a license to use, store, and display your content as necessary to provide the Service.
              </p>
              <p className="mt-2">
                You are responsible for ensuring that your content does not violate any laws or the rights of others.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Privacy</h2>
              <p>
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Disclaimer</h2>
              <p>
                The materials on Adventure Log are provided on an &apos;as is&apos; basis. Adventure Log makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Limitations</h2>
              <p>
                In no event shall Adventure Log or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use Adventure Log, even if Adventure Log or its authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Accuracy of Materials</h2>
              <p>
                The materials appearing on Adventure Log could include technical, typographical, or photographic errors. Adventure Log does not warrant that any of the materials on its website are accurate, complete, or current.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Modifications</h2>
              <p>
                Adventure Log may revise these terms of service at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us through the application.
              </p>
            </section>

            <div className="bg-muted border border-border rounded-lg p-4 mt-8">
              <p className="text-sm text-muted-foreground">
                These terms are subject to change. Continued use of Adventure Log after any changes constitutes acceptance of the new terms.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button asChild>
            <Link href="/">
              Return to Adventure Log
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}