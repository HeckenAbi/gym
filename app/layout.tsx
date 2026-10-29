import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegistration } from "../src/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gym Battle – Gemeinsam stärker",
    template: "%s · Gym Battle",
  },
  description:
    "Protokolliere dein Krafttraining, verfolge deinen Fortschritt und trainiere mit deiner Crew.",
  applicationName: "Gym Battle",
};

export const viewport: Viewport = {
  themeColor: "#090a0c",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col"><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}
