import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Marketing / staff chrome. Everything except the patient intake lives under
// this group so it keeps the header and footer. Route groups don't change URLs:
// (site)/page.tsx still serves "/", (site)/pharmacist still serves "/pharmacist".
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
