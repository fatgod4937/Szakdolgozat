import Footer from "./components/Footer/Footer";
import Navbar from "./components/Navbar/Navbar";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body>
        <Navbar></Navbar>
        {children}
        <Footer />
      </body>
    </html>
  );
}
