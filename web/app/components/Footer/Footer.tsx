import React from "react";

const Footer = () => {
  return (
    <div className="mt-10 flex flex-row  justify-around">
      <div
        style={{
          backgroundImage: `url('/images/logo.png')`,
        }}
        className="h-35 w-35 bg-cover bg-center"
      ></div>
      <div className="flex flex-col items-end justify-center">
        <a className="text-gray-500 text-[0.8rem]">Adatvédelmi tájékoztató</a>
        <a className="text-gray-400 text-[0.8rem]">2025 bla bla bla</a>
      </div>
    </div>
  );
};

export default Footer;
