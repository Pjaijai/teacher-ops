import { redirect } from "@/lib/i18n/routing";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  redirect({ href: "/dashboard", locale });
}
