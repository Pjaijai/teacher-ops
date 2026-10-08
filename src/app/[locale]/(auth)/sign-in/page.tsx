import { SignInForm } from "@/features/account/components/sign-in-form";
import { isLocalMode } from "@/lib/app-mode";
import { redirect } from "@/lib/i18n/routing";

export default async function SignInPage({ params }: PageProps<"/[locale]/sign-in">) {
  // Local mode has no accounts: work is saved on this device.
  if (isLocalMode) redirect({ href: "/dashboard", locale: (await params).locale });
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <SignInForm />
    </div>
  );
}
