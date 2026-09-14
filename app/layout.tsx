import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { NavigationProvider } from "@/components/navigation-provider";

export const metadata: Metadata = {
  title: "Sifat SMM",
  description: "Sifat SMM - Social Media Growth Platform",
  icons: {
    icon: "/logo1.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <NavigationProvider>{children}</NavigationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
