import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "ThinkFlow — Think Visually, Act Clearly",
  description:
    "Convert abstract problems into actionable subtasks using hierarchical visual flows and AI assistance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>
          <AuthShell>{children}</AuthShell>
        </Providers>
      </body>
    </html>
  );
}
