import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat, Patrick_Hand } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

// Print-style handwriting — pairs with Caveat for longer body copy and form fields.
const patrickHand = Patrick_Hand({
  variable: "--font-patrick",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Monther Abdelrazek | Junior Front-end Engineer",
  description:
    "An interactive 3D portfolio journey showcasing Monther Abdelrazek's frontend skills, projects, experience, and contact details.",
  authors: [{ name: "Monther Abdelrazek" }],
  creator: "Monther Abdelrazek",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${patrickHand.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
