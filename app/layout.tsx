import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Staff Portal — Olympic Paints",
  description: "Olympic Paints internal reports and dashboards.",
  icons: { icon: "/logo.jpg", apple: "/logo.jpg" },
};

export const viewport: Viewport = {
  themeColor: "#F5C400",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="theme-dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "var t=localStorage.getItem('oly-theme');if(t)document.documentElement.className=t;",
          }}
        />
      </head>
      <body style={{ paddingTop: "45px" }}>{children}</body>
    </html>
  );
}
