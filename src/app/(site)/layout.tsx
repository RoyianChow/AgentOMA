import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Public marketing routes that keep the header and footer live under this
// group. Route groups do not change URLs: (site)/page.tsx still serves "/".
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </>
  );
}
