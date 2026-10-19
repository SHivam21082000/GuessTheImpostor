import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guess the Impostor – Cricket edition",
  description: "A party game: everyone knows the cricketer except the impostor. Spot the bluffer.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d2318",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">{children}</main>
      </body>
    </html>
  );
}
