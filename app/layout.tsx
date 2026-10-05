import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trade Zone Premium | Stock Market Education",
  description:
    "Trade Zone Premium is a financial-market learning community focused on stock market education, technical analysis concepts, market study and risk management.",
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
