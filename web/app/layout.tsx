import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AOOSTAR WTR Max Display Control",
  description: "Control the AOOSTAR WTR Max embedded display",
  icons: { icon: "/logos/icon-light.png" },
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
