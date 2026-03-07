import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, MessageSquare, Github, Twitter, Send } from 'lucide-react'

export default function ContactPage() {
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
            <div className="p-2 bg-teal-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Contact Us
              </h1>
              <p className="text-muted-foreground">
                We&apos;d love to hear from you
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle>Get in Touch</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Have questions, feedback, or need support? We&apos;re here to help! Choose your preferred method of contact below.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Email Support */}
              <Card className="border-2 hover:border-teal-200 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <Mail className="h-5 w-5 text-teal-600" />
                    </div>
                    <h3 className="font-semibold text-lg">Email Support</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    For general inquiries and support
                  </p>
                  <a
                    href="mailto:support@adventurelog.app"
                    className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
                  >
                    <Send className="h-4 w-4" />
                    support@adventurelog.app
                  </a>
                </CardContent>
              </Card>

              {/* Bug Reports */}
              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Github className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-lg">Bug Reports</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    Found a bug? Report it on GitHub
                  </p>
                  <a
                    href="https://github.com/adventurelog/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <Github className="h-4 w-4" />
                    Open an Issue
                  </a>
                </CardContent>
              </Card>

              {/* Feature Requests */}
              <Card className="border-2 hover:border-blue-200 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-lg">Feature Requests</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    Suggest new features and improvements
                  </p>
                  <a
                    href="mailto:feedback@adventurelog.app"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Send className="h-4 w-4" />
                    feedback@adventurelog.app
                  </a>
                </CardContent>
              </Card>

              {/* Social Media */}
              <Card className="border-2 hover:border-cyan-200 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <Twitter className="h-5 w-5 text-cyan-600" />
                    </div>
                    <h3 className="font-semibold text-lg">Social Media</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    Follow us for updates and news
                  </p>
                  <a
                    href="https://twitter.com/adventurelog"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    <Twitter className="h-4 w-4" />
                    @adventurelog
                  </a>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              For partnerships, press inquiries, or other business matters:
            </p>
            <div className="bg-muted border border-border rounded-lg p-4">
              <a
                href="mailto:business@adventurelog.app"
                className="font-mono text-sm text-teal-600 hover:text-teal-700"
              >
                business@adventurelog.app
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Response Time</h3>
            <p className="text-amber-800 text-sm">
              We typically respond to emails within 24-48 hours during business days. For urgent issues, please indicate &quot;URGENT&quot; in your subject line.
            </p>
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
