import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';

export const metadata: Metadata = {
  title: 'ZYVEN — Local Businesses. Digital Possibilities.',
  description:
    'ZYVEN is a modern digital commerce infrastructure platform enabling local businesses to launch their online storefronts, manage live inventory, and fulfill store pickup orders.',
  metadataBase: new URL('https://zyven.me'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50/60 text-zinc-950 font-sans selection:bg-zinc-900 selection:text-white">
        <CartProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
