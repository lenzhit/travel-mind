"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prepareVisitor, RequestError, requestData } from "@/features/visitor/client";

const fieldClass = "mt-2 h-12 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
export function accountReturnTo(value: string | null) {
  return value && /^\/(?:quotes|reservations)\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value) ? value : "/reservations";
}
export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role?: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [register, setRegister] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    let active = true;
    requestData<{ username: string; role?: string }>("/api/customer/session").then(customer => { if (active) { setUser(customer); setReady(true); } }).catch(cause => {
      if (!active) return;
      if (cause instanceof RequestError && cause.status === 401) setReady(true);
      else setError("No pudimos comprobar tu sesión. Intenta nuevamente.");
    });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  return <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
    <div className="overflow-hidden rounded-2xl border bg-surface shadow-sm lg:grid lg:grid-cols-2">
      <section className="hidden space-y-6 bg-primary p-6 text-primary-foreground sm:p-10 lg:block">
        <span className="inline-flex size-12 items-center justify-center rounded-xl border border-primary-foreground/30"><MapPin aria-hidden="true" /></span>
        <div className="space-y-3"><p className="text-sm font-medium">Tu próximo viaje empieza aquí</p><p className="text-3xl font-bold leading-tight sm:text-4xl">Todos tus viajes,<br />en un solo lugar.</p><p className="max-w-sm leading-relaxed">Revisa tus cotizaciones, continúa tus solicitudes y sigue cada paso de tu reserva.</p></div>
        <Link href="/packages" className="inline-flex items-center gap-2 rounded py-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground">Explorar destinos <ArrowRight className="size-4" aria-hidden="true" /></Link>
      </section>
      <section aria-labelledby="account-title" className="p-6 sm:p-10">
        <h1 id="account-title" className="mb-6 text-2xl font-bold text-primary">{user ? "Mi cuenta" : register ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h1>
        {error && <p ref={errorRef} tabIndex={-1} id="account-error" role="alert" className="mb-5 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger outline-none focus-visible:ring-2 focus-visible:ring-danger">{error}</p>}
        {!ready ? <div>{error ? <Button variant="outline" onClick={() => { setError(""); setRevision(v => v + 1); }}>Volver a intentar</Button> : <p role="status">Comprobando tu sesión…</p>}</div> : user ? <div className="space-y-6"><p>Has ingresado como <strong>{user.username}</strong>.</p>{(!user.role || user.role === "customer") && <Button asChild className="h-12 w-full"><Link href="/reservations">Consultar mis reservas <ArrowRight aria-hidden="true" /></Link></Button>}{user.role === "admin" && <Button asChild className="h-12 w-full"><Link href="/account/operations">Resumen operativo <ArrowRight aria-hidden="true" /></Link></Button>}{user.role === "admin" && <Button asChild className="h-12 w-full"><Link href="/account/catalog">Gestionar paquetes <ArrowRight aria-hidden="true" /></Link></Button>}{(user.role === "admin" || user.role === "approver") && <Button asChild className="h-12 w-full"><Link href="/account/approvals">Revisar solicitudes <ArrowRight aria-hidden="true" /></Link></Button>}{user.role === "travel_agent" && <p className="text-sm text-muted-foreground">Tu cuenta tiene el rol de agente de viajes. La atención de casos asignados estará disponible próximamente.</p>}<Button variant="outline" className="h-12 w-full" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await requestData("/api/customer/session", { method: "DELETE" }); setUser(null); setRegister(false); setVisible(false); router.refresh(); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); } }}>{busy ? "Cerrando sesión…" : "Cerrar sesión"}</Button></div> : <>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{register ? "Elige un usuario y una contraseña para gestionar tus viajes." : "Ingresa para continuar con tus cotizaciones y reservas."}</p>
          <form key={register ? "register" : "login"} aria-label={register ? "Crear cuenta" : "Iniciar sesión"} aria-busy={busy} aria-describedby={error ? "account-error" : undefined} className="space-y-5" onSubmit={async event => {
            event.preventDefault(); if (busy) return;
            const form = new FormData(event.currentTarget);
            const password = String(form.get("password"));
            if (register && password !== form.get("confirmation")) { setError("Las contraseñas no coinciden. Revisa la confirmación."); return; }
            setBusy(true); setError("");
            try {
              await prepareVisitor();
              const customer = await requestData<{ username: string; role?: string }>("/api/customer/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: register ? "register" : "login", username: String(form.get("username")).trim().toLowerCase(), password }) });
              setUser(customer); router.replace(customer.role === "admin" || customer.role === "approver" || customer.role === "travel_agent" ? "/account" : accountReturnTo(new URLSearchParams(window.location.search).get("returnTo"))); router.refresh();
            } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión."); }
            finally { setBusy(false); }
          }}>
            <label className="block text-sm font-medium">Usuario<input name="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9_\-]+" autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={busy} aria-describedby="username-help" className={fieldClass} placeholder="Tu nombre de usuario" /></label>
            <p id="username-help" className="text-xs leading-relaxed text-muted-foreground">3 a 32 letras, números, guiones o guiones bajos.</p>
            <div><label htmlFor="account-password" className="text-sm font-medium">Contraseña</label><div className="relative"><input id="account-password" name="password" type={visible ? "text" : "password"} required minLength={12} maxLength={128} autoComplete={register ? "new-password" : "current-password"} disabled={busy} aria-describedby="password-help" className={`${fieldClass} pr-14`} /><button type="button" aria-controls="account-password" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} disabled={busy} onClick={() => setVisible(v => !v)} className="absolute right-1 bottom-1 flex size-10 items-center justify-center rounded-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}</button></div><p id="password-help" className="mt-2 text-xs text-muted-foreground">Al menos 12 caracteres.</p></div>
            {register && <label className="block text-sm font-medium">Confirmar contraseña<input name="confirmation" type="password" required minLength={12} maxLength={128} autoComplete="new-password" disabled={busy} className={fieldClass} /></label>}
            <Button type="submit" className="h-12 w-full" disabled={busy}>{busy ? "Procesando…" : register ? "Crear mi cuenta" : "Iniciar sesión"}<ArrowRight aria-hidden="true" /></Button>
          </form>
          <div className="mt-6 border-t pt-5 text-center"><p className="text-sm text-muted-foreground">{register ? "¿Ya tienes una cuenta?" : "¿Es tu primera visita?"}</p><Button type="button" variant="link" disabled={busy} className="mt-1 min-h-11" onClick={() => { setRegister(v => !v); setError(""); setVisible(false); }}>{register ? "Iniciar sesión" : "Crear una cuenta"}</Button></div>
          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Solo necesitas un nombre de usuario. No solicitamos datos de tarjeta ni documentos de identidad para crear tu cuenta.</p>
        </>}
      </section>
    </div>
  </div>;
}

