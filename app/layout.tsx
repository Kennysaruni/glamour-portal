import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glamour Homecare Staff & Caregiver Portal",
  description:
    "HIPAA-compliant internal clinical portal for Glamour Homecare, LLC (Fredericksburg, VA).",
  icons: {
    icon: [
      { url: "/Website-Icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/Website-Icon.png",
    apple: "/Website-Icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
