import { ExternalLink, Info } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Separator } from '../ui/separator'

export function AboutTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About FluentFlow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">FluentFlow</h3>
              <Badge variant="secondary">Version 1.0.0</Badge>
            </div>
            <p className="text-muted-foreground">
              A powerful YouTube language learning tool that helps you practice pronunciation
              by recording and comparing your voice with native speakers.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Features:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Practice session management</li>
              <li>• Keyboard shortcuts for efficiency</li>
              <li>• AI-powered conversation analysis</li>
              <li>• Loop creation and practice tracking</li>
              <li>• Cloud sync across devices</li>
              <li>• Premium features with subscription</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Links:</h4>
            <div className="space-y-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://developer.chrome.com/docs/extensions/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Chrome Extension Documentation
                </a>
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Privacy & Security:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• All data encrypted in transit and at rest</li>
              <li>• No data sharing with third parties</li>
              <li>• Local storage fallback for offline use</li>
              <li>• GDPR compliant data handling</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}