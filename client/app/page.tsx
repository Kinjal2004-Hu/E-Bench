"use client";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import PurposeSection from "@/components/sections/PurposeSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import SourcesSection from "@/components/sections/SourcesSection";
import FAQSection from "@/components/sections/FAQSection";
import ContactSection from "@/components/sections/ContactSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <PurposeSection />
        <FeaturesSection />
        <SourcesSection />
        <FAQSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
