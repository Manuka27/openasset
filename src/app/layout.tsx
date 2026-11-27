import type { Metadata } from "next";
import { WorkspaceTheme } from "@/components/WorkspacePreferences";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenAsset",
  description: "IT asset and inventory management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><WorkspaceTheme />{children}</body>
    </html>
  );
}
