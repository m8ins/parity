'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const busy = useRef(false);
  const supabase = createClient();
  const router = useRouter();

  const submit = async (event: React.FormEvent, method: 'code' | 'password') => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const { error: authError } = method === 'password'
        ? await supabase.auth.signInWithPassword({ email, password })
        : showOtpInput
          ? await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
          : await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
      if (authError) {
        setError(authError.code === 'over_email_send_rate_limit' || authError.status === 429
          ? 'Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.'
          : method === 'password'
            ? 'Anmeldung nicht möglich. Prüfe E-Mail-Adresse und Passwort und versuche es erneut.'
            : showOtpInput
              ? 'Der Code konnte nicht bestätigt werden. Prüfe den Code und versuche es erneut. Für einen neuen Code wähle „Andere E-Mail verwenden“.'
              : 'Der Code konnte nicht angefordert werden. Prüfe die E-Mail-Adresse und versuche es erneut.');
      } else if (method === 'code' && !showOtpInput) {
        setMessage('Code angefordert. Schau in dein E-Mail-Postfach und prüfe auch den Spamordner.');
        setShowOtpInput(true);
      } else {
        setMessage('Angemeldet. Deine Zähler werden geladen …');
        router.refresh();
      }
    } catch {
      setError('Keine Verbindung möglich. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };
  const description = error ? 'auth-error' : undefined;
  return (
    <main className="auth-screen">
      <Card className="auth-card">
        <CardHeader>
          <CardTitle>Bei Parity anmelden</CardTitle>
          <CardDescription>Deine Zähler und Ablesungen im Blick.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="code" onValueChange={() => { setError(''); setMessage(''); }}>
            <TabsList className="mb-4" aria-label="Anmeldeverfahren">
              <TabsTrigger value="code" disabled={loading}>E-Mail-Code</TabsTrigger>
              <TabsTrigger value="password" disabled={loading}>Passwort</TabsTrigger>
            </TabsList>
            <TabsContent value="code">
              <form className="parity-form" onSubmit={event => submit(event, 'code')} aria-busy={loading}>
                <fieldset disabled={loading}>
                  <div className="form-field">
                    <Label htmlFor="code-email">E-Mail-Adresse</Label>
                    <Input id="code-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required readOnly={showOtpInput} aria-describedby={description} />
                  </div>
                  {showOtpInput && <div className="form-field">
                    <Label htmlFor="email-code">Anmeldecode</Label>
                    <Input id="email-code" type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={event => setOtp(event.target.value)} required aria-invalid={!!error} aria-describedby={description} />
                  </div>}
                  <p className="text-sm text-muted-foreground">{showOtpInput ? `Gib den Code aus der E-Mail an ${email} ein.` : 'Du erhältst einen Anmeldecode per E-Mail.'}</p>
                  <Button type="submit">{loading ? 'Bitte warten …' : showOtpInput ? 'Code bestätigen' : 'Code anfordern'}</Button>
                  {showOtpInput && <Button type="button" variant="ghost" onClick={() => { setShowOtpInput(false); setOtp(''); setMessage(''); setError(''); }}>Andere E-Mail verwenden</Button>}
                </fieldset>
              </form>
            </TabsContent>
            <TabsContent value="password">
              <form className="parity-form" onSubmit={event => submit(event, 'password')} aria-busy={loading}>
                <fieldset disabled={loading}>
                  <div className="form-field"><Label htmlFor="password-email">E-Mail-Adresse</Label><Input id="password-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required aria-describedby={description} /></div>
                  <div className="form-field"><Label htmlFor="login-password">Passwort</Label><Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required aria-describedby={description} /></div>
                  <Button type="submit">{loading ? 'Wird angemeldet …' : 'Anmelden'}</Button>
                </fieldset>
              </form>
            </TabsContent>
          </Tabs>
          {error && <p id="auth-error" className="form-error mt-4" role="alert">{error}</p>}
          <p className="form-success mt-4" role="status">{message}</p>
        </CardContent>
      </Card>
    </main>
  );
}
