import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-gradient-to-t from-white via-[#fffaf3] to-[var(--hero-top-color)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[42svh] bg-contain bg-bottom bg-no-repeat sm:h-[48svh] lg:h-[60svh]"
        style={{ backgroundImage: 'url("/images/bg.png")' }}
      />
      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col items-center px-5 pb-[42svh] pt-[calc(8rem+env(safe-area-inset-top))] text-center sm:px-8 sm:pb-[48svh] lg:justify-center lg:pb-[32svh]">
        <p className="text-4xl font-semibold text-black sm:text-5xl lg:text-6xl">
          Fogadj örökbe egy életet
        </p>
        <p className="max-w-3xl pt-5 text-base leading-7 text-black sm:pt-8 sm:text-xl">
          Adj egy szereto otthont egy raszorulo kisallatnak, es legy az o orok
          csaladja. Talald meg a huseges tarsadat meg ma!
        </p>
        <Link
          to="/auth?mode=register"
          className="group mt-8 inline-flex items-center gap-3 rounded-4xl bg-[#fec8e9] px-5 py-3 text-lg transition duration-300 hover:-translate-y-1 hover:bg-[#f7acd6] hover:shadow-[0_14px_30px_rgba(170,47,117,0.24)] focus-visible:-translate-y-1 focus-visible:bg-[#f7acd6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black sm:text-xl"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
            <ArrowRight
              size={18}
              aria-hidden="true"
              className="scale-[1] transition-transform duration-300 ease-out group-hover:scale-150 group-focus-visible:scale-150"
            />
          </span>
          <span>Get Started</span>
        </Link>
      </div>
    </section>
  );
};

export default HeroSection;
