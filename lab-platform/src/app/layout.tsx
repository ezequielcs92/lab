import type { Metadata } from "next";
import "./globals.css";
import SiteShell from "@/components/layout/SiteShell";
import ThemeProvider from "@/components/layout/ThemeProvider";

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
  icons: {
    icon: "/logos/lab.svg",
    shortcut: "/logos/lab.svg",
    apple: "/logos/lab.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full" data-scroll-behavior="smooth">
      <head>
        {/* No-flash script: applies stored theme class before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('lab-theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <SiteShell>{children}</SiteShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
