import { Bug, Rocket, Sparkles, Wrench } from 'lucide-react'

import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { Separator } from '../components/ui/separator'
import '../styles/globals.css'

const releaseNotes = [
  {
    version: '1.2.0',
    date: 'August 26, 2025',
    notes: [
      {
        type: 'feature',
        text: 'Enhanced AI Chat Panel with real-time suggestions.'
      },
      {
        type: 'improvement',
        text: 'Optimized audio processing for faster transcript generation.'
      },
      {
        type: 'bug',
        text: 'Resolved an issue where recording sometimes failed to save.'
      },
      {
        type: 'improvement',
        text: 'Improved UI responsiveness across all components.'
      }
    ]
  },
  {
    version: '1.1.0',
    date: 'July 15, 2025',
    notes: [
      {
        type: 'feature',
        text: 'Added a new dashboard with analytics and session tracking.'
      },
      {
        type: 'improvement',
        text: 'Refactored storage management for better performance.'
      },
      { type: 'bug', text: 'Fixed display issues on smaller screens.' }
    ]
  },
  {
    version: '1.0.0',
    date: 'June 1, 2025',
    notes: [
      {
        type: 'feature',
        text: 'Initial Release: Core functionality for audio recording and basic transcript generation.'
      },
      { type: 'feature', text: 'Feature: Basic AI quick actions.' }
    ]
  }
]

const noteMeta = {
  feature: {
    label: 'New Feature',
    icon: Sparkles,
    badgeVariant: 'default',
    iconColor: 'text-green-500'
  },
  improvement: {
    label: 'Improvement',
    icon: Wrench,
    badgeVariant: 'secondary',
    iconColor: 'text-blue-500'
  },
  bug: {
    label: 'Bug Fix',
    icon: Bug,
    badgeVariant: 'destructive',
    iconColor: 'text-red-500'
  }
}

const WhatsNew = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl space-y-8 p-4 py-12 md:p-8">
        <div className="space-y-2 text-center">
          <h1 className="flex items-center justify-center gap-3 text-4xl font-bold">
            <Rocket className="h-10 w-10 text-primary" />
            What's New in FluentFlow
          </h1>
          <p className="text-lg text-muted-foreground">
            Check out the latest features, improvements, and bug fixes.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-10">
              {releaseNotes.map((release, index) => (
                <section key={release.version}>
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold">Version {release.version}</h2>
                    <p className="text-muted-foreground">{release.date}</p>
                  </div>
                  <ul className="space-y-4">
                    {release.notes.map((note, noteIndex) => {
                      const meta = noteMeta[note.type]
                      const Icon = meta.icon
                      return (
                        <li key={noteIndex} className="flex items-start gap-4">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                            <Icon className={`h-5 w-5 ${meta.iconColor}`} />
                          </div>
                          <div>
                            <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                            <p className="mt-1 text-muted-foreground">{note.text}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  {index < releaseNotes.length - 1 && <Separator className="mt-10" />}
                </section>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground">
          Thank you for using FluentFlow! We're constantly working to improve your experience.
        </p>
      </div>
    </div>
  )
}

export default WhatsNew