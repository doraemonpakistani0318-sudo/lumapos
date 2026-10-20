import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LumaPOS — Shop Management",
  description: "Modern point of sale and inventory management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}