import { useEffect, useState } from "react";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight / 16) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <div className="px-[100px] top-0 left-0 fixed w-full z-[9999]">
      <div
        className={`flex flex-row justify-between items-center px-5 text-sm z-[100] transition-all ease-in-out duration-300 ${
          scrolled
            ? "bg-white/80 mt-2 backdrop-blur-md shadow-md rounded-full"
            : "bg-transparent mt-4"
        }`}
      >
        <a href="#">
          <div
            style={{
              backgroundImage: `url('/images/logo.png')`,
            }}
            className="h-12 w-12 bg-cover bg-center"
          ></div>
        </a>
        <div className="space-x-10">
          <a href="#">home</a>
          <a href="#services">services</a>
          <a href="#">login</a>
          <a href="#about">about</a>
          <a href="#blog">blog</a>
        </div>

        <a
          className={`px-3 py-1 rounded-full transition-all ease-in-out duration-500 ${
            scrolled ? "bg-[#fec8e9]" : "bg-[#FFFF]"
          }`}
        >
          Letoltes
        </a>
      </div>
    </div>
  );
};

export default Navbar;
