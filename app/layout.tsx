import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const base = new URL(`${protocol}://${host}`);
  const title = "Sempre Observados | Uma intervenção sobre privacidade";
  const description =
    "Uma intervenção artística sobre vigilância, rastros digitais e o direito à privacidade.";

  return {
    metadataBase: base,
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "pt_BR",
      images: [{ url: new URL("/og.png", base), width: 1200, height: 630, alt: "Sempre Observados" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/og.png", base)],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
