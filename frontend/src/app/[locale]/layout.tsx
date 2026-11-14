import type { Metadata } from "next";
import "../globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';
import PageTransitionLoader from "@/components/PageTransitionLoader";
import QueryRecoveryNotice from "@/components/QueryRecoveryNotice";

export const metadata: Metadata = {
  title: "DICE - Digital Illustration Commission Exchange",
  description: "Single-Tenant Freelance Management System & Art Showcase",
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }
  
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`font-sans antialiased min-h-screen bg-[var(--bg-primary,#09090b)] text-[var(--text-primary,#f4f4f5)] flex flex-col pb-20 md:pb-0 transition-colors duration-200`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <PageTransitionLoader />
            <Header />
            <main className="flex-1 flex flex-col">
              <QueryRecoveryNotice />
              {children}
            </main>
            <BottomNav />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
