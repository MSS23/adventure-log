import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield, Eye, Database, Cookie, UserCheck } from 'lucide-react'

export default function PrivacyPage() {
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
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Privacy Policy
              </h1>
              <p className="text-muted-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle>Your Privacy Matters to Us</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                Adventure Log is committed to protecting your privacy and ensuring you have control over your personal information.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Account Information</h3>
                <p className="text-muted-foreground">
                  When you create an account, we collect your email address and any profile information you choose to provide.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Content You Share</h3>
                <p className="text-muted-foreground">
                  Photos, captions, location data, and other content you upload to create your travel albums and stories.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Usage Information</h3>
                <p className="text-muted-foreground">
                  Information about how you use Adventure Log, including feature usage and performance data to improve our service.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-600" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Provide Our Service</h3>
                <p className="text-muted-foreground">
                  To operate Adventure Log, display your content, and provide features like the interactive globe visualization.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Improve User Experience</h3>
                <p className="text-muted-foreground">
                  To analyze usage patterns and improve our features, performance, and user interface.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Communication</h3>
                <p className="text-muted-foreground">
                  To send important updates about your account, security notifications, and service announcements.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                Your Privacy Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Content Privacy</h3>
                <p className="text-muted-foreground">
                  You control who can see your albums and photos through privacy settings (private, friends only, or public).
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Account Management</h3>
                <p className="text-muted-foreground">
                  You can update, download, or delete your account and data at any time through your account settings.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Location Data</h3>
                <p className="text-muted-foreground">
                  Location information is only collected from photos you upload and is used to place your travels on the globe.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Encryption</h3>
                <p className="text-muted-foreground">
                  All data is encrypted in transit and at rest using industry-standard security measures.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Access Controls</h3>
                <p className="text-muted-foreground">
                  We implement strict access controls and authentication requirements to protect your data.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Regular Security Updates</h3>
                <p className="text-muted-foreground">
                  Our systems are regularly updated and monitored for security vulnerabilities.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-orange-600" />
                Cookies and Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Essential Cookies</h3>
                <p className="text-muted-foreground">
                  We use essential cookies to maintain your login session and remember your preferences.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Analytics</h3>
                <p className="text-muted-foreground">
                  We collect anonymous usage analytics to understand how Adventure Log is used and improve the experience.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">No Third-Party Tracking</h3>
                <p className="text-muted-foreground">
                  We do not share your personal data with third-party advertisers or tracking companies.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Sharing and Third Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">No Data Sales</h3>
                <p className="text-muted-foreground">
                  We never sell your personal information to third parties.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Service Providers</h3>
                <p className="text-muted-foreground">
                  We work with trusted service providers (like cloud hosting) who help us operate Adventure Log. These providers are bound by strict confidentiality agreements.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Legal Requirements</h3>
                <p className="text-muted-foreground">
                  We may disclose information only when required by law or to protect our users&apos; safety.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Access and Portability</h3>
                <p className="text-muted-foreground">
                  You can access and download all your data through your account settings.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Correction</h3>
                <p className="text-muted-foreground">
                  You can update or correct your information at any time through your profile settings.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Deletion</h3>
                <p className="text-muted-foreground">
                  You can delete your account and all associated data. This action is permanent and cannot be undone.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about this Privacy Policy or your data, please contact us through the application or at:
              </p>
              <div className="bg-muted border border-border rounded-lg p-4">
                <p className="font-mono text-sm">privacy@adventurelog.app</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <p className="text-amber-800 text-sm">
                <strong>Changes to This Policy:</strong> We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </CardContent>
          </Card>
        </div>

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