import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AOOSTAR Display",
  description: "Control the AOOSTAR WTR Max embedded display",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
