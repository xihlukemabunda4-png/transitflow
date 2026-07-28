import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n/context';
import './globals.css';

export const metadata: Metadata = {
  title: 'TransitFlow',
  description: 'The smarter way to move.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
