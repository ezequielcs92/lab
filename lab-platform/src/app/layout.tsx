import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: {
    default: "LAB - Liga Argentina de Béisbol",
    template: "%s | LAB",
  },
  description:
    "Plataforma oficial de la Liga Argentina de Béisbol. Resultados, estadísticas, archivo histórico y más.",
  keywords: [
    "béisbol",
    "argentina",
    "liga",
    "baseball",
    "deportes",
    "LAB",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1 pt-[calc(4rem+4px)]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
