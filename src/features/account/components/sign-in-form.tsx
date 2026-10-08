"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/lib/i18n/routing";
import { qk } from "@/lib/query-keys";

export function SignInForm() {
  const t = useTranslations("account.signIn");
  const common = useTranslations("common");
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setBusy(false);
    if (error) toast.error(error.message ?? common("error"));
    else setSent(true);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await authClient.signIn.emailOtp({ email, otp: code.trim() });
    setBusy(false);
    if (error) return toast.error(t("failed"));
    await qc.invalidateQueries({ queryKey: qk.me });
    router.replace("/dashboard");
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          variant="outline"
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: window.location.pathname.replace(/sign-in$/, "dashboard") })}
        >
          {t("google")}
        </Button>
        <div className="flex items-center gap-2">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs">{t("or")}</span>
          <Separator className="flex-1" />
        </div>
        {!sent ? (
          <form onSubmit={sendCode} className="grid gap-3">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" disabled={busy}>
              {t("sendCode")}
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="grid gap-3">
            <p className="text-muted-foreground text-sm">{t("codeSent", { email })}</p>
            <Label htmlFor="code">{t("code")}</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center text-lg tracking-[0.4em]"
            />
            <Button type="submit" disabled={busy || code.trim().length !== 6}>
              {t("verify")}
            </Button>
            <Button type="button" variant="link" onClick={() => setSent(false)}>
              {t("changeEmail")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
