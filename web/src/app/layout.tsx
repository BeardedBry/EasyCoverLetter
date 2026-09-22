import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const letter = Source_Serif_4({
  variable: "--font-letter",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "EasyCoverLetter",
  description:
    "Phone-friendly cover letters from a job description and resume. OpenAI key stays in your browser.",
  applicationName: "EastCoverLetter",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "EastCoverLetter",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f6b4a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${letter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
