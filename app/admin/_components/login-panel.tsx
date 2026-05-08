'use client'

import { FormEvent, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db } from '@/lib/db'

export function LoginPanel() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (!sent) {
        await db.auth.sendMagicCode({ email })
        setSent(true)
      } else if (sent) {
        await db.auth.signInWithMagicCode({ email, code })
      } else {
        setError('Unauthorized')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-secondary px-4 py-10">
      <div className="mx-auto max-w-md rounded-lg border border-border bg-background p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Foto3D Admin</h1>
            <p className="text-sm text-muted-foreground">Manage products, colors, and orders.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} required />
          </div>
          {sent && (
            <div>
              <Label htmlFor="code">Magic Code</Label>
              <Input id="code" type="text" value={code} onChange={event => setCode(event.target.value)} required />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Loading...' : sent ? 'Verify Code' : 'Send Code'}
          </Button>
        </form>
      </div>
    </main>
  )
}
