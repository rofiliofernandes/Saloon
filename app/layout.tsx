import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "AK Hair & Beauty Salon",
  description:
    "Book appointments online at AK Hair & Beauty Salon.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8f6f2] text-neutral-900">
        <Navbar />

        <div className="min-h-[calc(100vh-64px)]">
          {children}
        </div>

        <Footer />
      </body>
    </html>
  );
}
