import { LandingPage } from "@/components/home/landing-page";
import { faqs, features, plans } from "@/components/home/content";

export default function Home() {
  return <LandingPage features={features} plans={plans} faqs={faqs} />;
}
