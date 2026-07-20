import React, { useState } from "react";
import useIsMobile from "../../hooks/useIsMobile";

const HeroSection = () => {
  const isMobile = useIsMobile();

  const style = !isMobile
    ? "h-full w-full bg-cover bg-center -mt-40"
    : "min-h-[320px] w-full bg-cover bg-center max-h-[320px]";

  return (
    <section className="flex flex-col h-[100vh] lg:mt-0 mt-8">
      <div className="flex flex-col h-full w-full items-center justify-center bg-gradient-to-t from-white via-[#fffaf3] to-[#fff5eb] text-center pt-32">
        <p className="lg:text-6xl text-4xl font-semibold text-black ">
          Fogadj örökbe egy életet
        </p>
        <p className="lg:text-xl text-black max-w-3xl pt-8">
          Adj egy szereto otthont egy raszorulo kisallatnak, es legy az o orok
          csaladja. Talald meg a huseges tarsadat meg ma!
        </p>
        <a className="mt-8 text-xl bg-[#fec8e9] p-3 rounded-4xl flex flex-row justify-center items-center space-x-3 z-[150]">
          <span className="w-5 bg-white h-5 rounded-4xl"></span>
          <span>Get Started</span>
        </a>
        <div
          style={{
            backgroundImage: `url('/images/3730286_73962.png')`,
          }}
          // className="lg:h-full sm:min-h-[320px] w-full bg-cover bg-center lg:-mt-40 sm:max-h-[320px]"
          className={style}
        ></div>
      </div>
    </section>
  );
};

export default HeroSection;
