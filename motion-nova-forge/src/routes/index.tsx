import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/home/Hero";
import { DiplomaPaths, FinalCTA, HomeFaq, UpcomingSessions, Universe } from "@/components/home/Sections";
import { Marquee } from "@/components/fx/Marquee";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "i-Motion Academy — Formations professionnelles" },
      {
        name: "description",
        content:
          "Formations professionnelles en EMS, coaching, bien-être, langues, intelligence artificielle et parcours diplômants BTP et BTS.",
      },
      { property: "og:title", content: "i-Motion Academy — Formations professionnelles" },
      {
        property: "og:description",
        content: "Développez vos compétences grâce à des formations adaptées aux réalités professionnelles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <Hero />
      <Marquee
        className="border-y border-border/60 py-6"
        items={["EMS", "Coaching", "Bien-être", "Langues", "BTP & BTS", "Intelligence artificielle"]}
      />
      <Universe />
      <DiplomaPaths />
      <UpcomingSessions />
      <HomeFaq />
      <FinalCTA />
    </>
  );
}
