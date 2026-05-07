import type { Metadata } from 'next'
import { LockKeyhole } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginToMunzua } from './actions'

export const metadata: Metadata = {
  title: 'Entrar no Munzua',
}

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; next?: string }>
}

export default async function MunzuaLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const error = params?.error
  const nextPath = params?.next ?? '/munzua'
  const isMissingPassword = !process.env.MUNZUA_PASSWORD || error === 'missing-password'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5f0] px-4 py-10">
      <Card className="w-full max-w-md border bg-background shadow-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-2xl">Munzua Studio</CardTitle>
            <CardDescription>Introduza a palavra-passe partilhada para continuar.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isMissingPassword ? (
            <Alert variant="destructive">
              <AlertDescription>
                A variável MUNZUA_PASSWORD não está configurada neste ambiente.
              </AlertDescription>
            </Alert>
          ) : (
            <form action={loginToMunzua} className="space-y-4">
              {error === 'invalid' && (
                <Alert variant="destructive">
                  <AlertDescription>Palavra-passe incorrecta. Tente novamente.</AlertDescription>
                </Alert>
              )}

              <input type="hidden" name="next" value={nextPath} />

              <div className="space-y-2">
                <Label htmlFor="password">Palavra-passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Entrar no Studio
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
