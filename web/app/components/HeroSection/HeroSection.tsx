import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import useIsMobile from "../../hooks/useIsMobile";

const HeroSection = () => {
  const isMobile = useIsMobile();

  const style = !isMobile
    ? "h-full w-full bg-cover bg-center -mt-75 "
    : "min-h-[320px] w-full bg-cover bg-center";

  return (
    <section className="flex min-h-[100dvh] flex-col lg:mt-0 lg:h-screen ">
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-t from-white via-[#fffaf3] to-[var(--hero-top-color)] pb-[env(safe-area-inset-bottom)] pt-[calc(8rem+env(safe-area-inset-top))] text-center">
        <div className={!isMobile ? `mt-80` : "mt-45"}>
          <p className="lg:text-6xl text-4xl font-semibold text-black ">
            Fogadj örökbe egy életet
          </p>
          <p className="lg:text-xl text-black max-w-3xl pt-8">
            Adj egy szereto otthont egy raszorulo kisallatnak, es legy az o orok
            csaladja. Talald meg a huseges tarsadat meg ma!
          </p>
          <Link
            to="/auth?mode=register"
            className="group z-[150] mt-8 inline-flex items-center gap-3 rounded-4xl bg-[#fec8e9] px-5 py-3 text-xl transition duration-300 hover:-translate-y-1 hover:bg-[#f7acd6] hover:shadow-[0_14px_30px_rgba(170,47,117,0.24)] focus-visible:-translate-y-1 focus-visible:bg-[#f7acd6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
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
        <div
          style={{
            backgroundImage: `url("/images/bg.png")`,
          }}
          // className="lg:h-full sm:min-h-[320px] w-full bg-cover bg-center lg:-mt-40 sm:max-h-[320px]"
          className={style}
        ></div>
      </div>
    </section>
  );
};

export default HeroSection;
