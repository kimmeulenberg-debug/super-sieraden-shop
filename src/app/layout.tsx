import type { Metadata } from "next";
import { Jost } from "next/font/google";
import Link from "next/link";
import Header from "@/components/Header";
import CookieBanner from "@/components/CookieBanner";
import CartDrawer from "@/components/CartDrawer";
import Toast from "@/components/Toast";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Super Sieraden Shop",
  description: "Handgemaakte sieraden. Elk stuk gemaakt met liefde.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${jost.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border-soft bg-white px-6 py-8 text-sm text-ink-soft">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 md:flex-row">
            <p>&copy; {new Date().getFullYear()} Super Sieraden Shop. Elk stuk gemaakt met liefde.</p>
            <nav aria-label="Footer" className="flex gap-4">
              <Link href="/" className="transition-colors duration-150 ease-in-out hover:text-goud">
                Home
              </Link>
              <a
                href="/cookiebeleid"
                className="transition-colors duration-150 ease-in-out hover:text-goud"
              >
                Cookiebeleid
              </a>
            </nav>
          </div>
        </footer>
        <CookieBanner />
        <CartDrawer />
        <Toast />
      </body>
    </html>
  );
}
