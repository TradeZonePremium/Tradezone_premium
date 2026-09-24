import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trade Zone Premium",
  description:
    "Join the Trade Zone Premium WhatsApp group. Verify your email, pay securely, get your invite.",
  other: {
    "facebook-domain-verification": "0s3dutshsx4mofnq5uz6oh3gb2rgj2",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
