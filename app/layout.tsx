import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Charts — Chat & Visualize Data",
  description: "Chat with AI to generate charts, analyze CSV data, and get predictions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
