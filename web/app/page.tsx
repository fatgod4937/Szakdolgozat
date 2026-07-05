import AboutUs from "./components/AboutUs/AboutUs";
import { Belt } from "./components/Belt/Belt";
import Faq from "./components/Faq/Faq";
import HeroSection from "./components/HeroSection/HeroSection";
import Philosophy from "./components/Philosophy/Philosophy";
import Team from "./components/Team/Team";

export default function Home() {
  return (
    <>
      {/*hero section todo: feher gradient, seemless gorgetes miatt*/}
      <HeroSection />
      {/*filo*/}
      <div
        id="services"
        className="flex flex-row justify-center items-center mt-10 pt-25"
      >
        <div className=" w-full max-w-3/6">
          {/* filo */}
          <Philosophy />
          {/* csapat */}
          <Team />
          {/* belt */}
          <Belt />
          <div
            className="flex flex-col items-center justify-center w-full pt-10"
            id="blog"
          >
            <h2 className="text-xl font-bold mt-12">Valami szöveg</h2>
          </div>
          {/* Faq */}
          <Faq />
          {/*who are we */}
          <AboutUs />
        </div>
      </div>
    </>
  );
}
