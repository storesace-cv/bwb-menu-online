import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BWB Menu Online",
  description: "Menu online por loja",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
