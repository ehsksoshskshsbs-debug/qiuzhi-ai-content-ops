import type { Metadata } from "next";
import PortfolioClient from "./portfolio-client";
import "./portfolio.css";

export const metadata: Metadata = {
  title: "AI内容运营投递作品｜秋芝2046公开内容研究",
  description: "一套包含账号观察、选题、五端内容样稿、七天排期、模拟反馈与复盘实验的个人求职作品。",
};

export default function PortfolioPage() {
  return <PortfolioClient />;
}
