import AboutUs from "./components/AboutUs/AboutUs";
import { Belt } from "./components/Belt/Belt";
import Faq from "./components/Faq/Faq";
import HeroSection from "./components/HeroSection/HeroSection";
import Philosophy from "./components/Philosophy/Philosophy";
import Team from "./components/Team/Team";

export default function Home() {
  return (
    <>
      <HeroSection />
      <div
        id="services"
        className="mt-10 flex justify-center px-4 pt-10 sm:px-6 lg:pt-24"
      >
        <div className="w-full max-w-5xl">
          <Philosophy />
          <Team />
          <Belt />
          <Faq />
          <AboutUs />
        </div>
      </div>
    </>
  );
}
