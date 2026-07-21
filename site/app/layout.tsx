import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const title = "快速了解秋芝2046｜账号洞察与视频速览";
  const description = "快速了解秋芝2046的账号定位、内容表达与30条代表视频。";
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: `${origin}/og.png`, width: 1716, height: 906, alt: "秋芝2046账号洞察与视频速览" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
