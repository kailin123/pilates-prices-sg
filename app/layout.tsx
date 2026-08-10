import type { Metadata } from "next";
import Link from "next/link";
import { Anton, Archivo } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pilates Price Where? — Compare Singapore reformer studio prices",
  description:
    "Compare drop-in, class packs, memberships and current promos across Singapore reformer pilates studios in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <nav className="border-b-2 border-line">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="font-display text-xl uppercase tracking-wide text-fg">
              <span className="text-volt">Pilates Price</span> Where?
            </Link>
            <div className="flex items-center gap-6 text-xs font-semibold uppercase tracking-wider">
              <Link href="/" className="text-fg transition hover:text-volt">Prices</Link>
              <Link href="/how-it-works" className="text-muted transition hover:text-volt">How it works</Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
