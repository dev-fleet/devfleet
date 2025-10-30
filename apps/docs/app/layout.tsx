import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@workspace/ui/components/sonner";
import { Layout, Navbar, Footer } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import Image from "next/image";
// Styles
import "@workspace/ui/globals.css";
import "nextra-theme-docs/style.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevFleet - AI-Powered Coding Platform",
  description:
    "Join the future of development with DevFleet's intelligent coding platform. Build with AI-powered agents that understand your code.",
  icons: {
    icon: [
      { url: "/docs/favicon.ico", sizes: "any" },
      { url: "/docs/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/docs/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/docs/apple-touch-icon.png",
    shortcut: "/docs/favicon.ico",
    other: [{ rel: "manifest", url: "/docs/site.webmanifest" }],
  },
  manifest: "/docs/site.webmanifest",
};

const Logo = () => (
  <div className="flex items-center">
    <Image
      src="/docs/devfleet-logo.png"
      alt="DevFleet"
      width={120}
      height={32}
      className="dark:hidden"
    />
    <Image
      src="/docs/devfleet-logo-inverted.png"
      alt="DevFleet"
      width={120}
      height={32}
      className="hidden dark:block"
    />
  </div>
);

const navbar = (
  <Navbar
    logo={<Logo />}
    // projectLink="https://github.com/muratsu/mcplens"
    // chatLink="https://discord.gg/W6jYq46Frd"
  />
);
const footer = (
  <Footer>© {new Date().getFullYear()} DevFleet. All rights reserved.</Footer>
);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      // Not required, but good for SEO
      lang="en"
      // Required to be set
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
    >
      <Head>
        {/* Your additional tags should be passed as `children` of `<Head>` element */}
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          editLink={null}
          feedback={{ content: null }}
          footer={footer}
          navigation={{
            prev: true,
            next: true,
          }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
