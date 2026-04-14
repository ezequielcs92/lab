import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { headers } from "next/headers";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? headersList.get("x-invoke-path") ?? ""
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/login")

  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">
        {!isAdmin && <Navbar />}
        <main className={`flex-1 ${!isAdmin ? "pt-[calc(4rem+4px)]" : ""}`}>{children}</main>
        {!isAdmin && <Footer />}
      </body>
    </html>
  );
}
