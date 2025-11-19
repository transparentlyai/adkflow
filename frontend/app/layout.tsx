import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "ADKFlow - Visual Workflow Editor",
  description: "Visual workflow editor for Google Agent Development Kit (ADK)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
