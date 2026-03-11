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
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </head>
      <body>{children}</body>
    </html>
  );
}
