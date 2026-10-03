import Link from "next/link";
import { FooterSection } from "@/components/landing/footer-section";
import { HeroSection } from "@/components/landing/hero-section";
import { Navigation } from "@/components/landing/navigation";

const valuePoints = [
  {
    title: "Understand the field",
    text: "Track the conditions that shape crop performance before stress starts to spread.",
  },
  {
    title: "Make faster decisions",
    text: "Turn noisy field signals into a single, clear picture of risk and readiness.",
  },
  {
    title: "Protect the harvest",
    text: "Act early with visibility across soil, climate, and plant health indicators.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navigation />
      <HeroSection />

      <section className="relative py-20 lg:py-28 border-t border-foreground/10 bg-background">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground font-mono">Why Mrittika</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-display tracking-tight text-foreground">
              A calmer way to read the land.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {valuePoints.map((point) => (
              <div key={point.title} className="border border-foreground/10 bg-foreground/[0.02] p-6 lg:p-8">
                <div className="mb-5 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">01</div>
                <h3 className="text-2xl font-display mb-4 text-foreground">{point.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">{point.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 lg:py-28 border-t border-foreground/10 bg-background">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground font-mono">Field intelligence</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-display tracking-tight text-foreground">
              Clear signals. Better timing. Stronger outcomes.
            </h2>
          </div>

          <Link
            href="/field-analysis"
            className="inline-flex items-center justify-center rounded-full border border-foreground/15 bg-foreground text-background px-6 py-3 text-sm font-medium transition-colors hover:bg-foreground/90"
          >
            Open field view
          </Link>
        </div>
      </section>

      <FooterSection />
    </main>
  );
}
