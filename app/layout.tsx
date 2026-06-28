import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aeons Unchained Table",
  description: "A campaign and character workspace for Aeons Unchained.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
