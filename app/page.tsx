import Link from "next/link";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import HomeGallery from "@/components/home-gallery";

const experiences = [
  {
    title: "Unisex",
    description:
      "Modern services designed for everyone.",
    href: "/services",
    number: "01",
  },
  {
    title: "Bridal",
    description:
      "Complete beauty preparation for your special day.",
    href:"/services?category=bridal&highlight=1",
    number: "02",
  },
];

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20">
        <div className="grid overflow-hidden rounded-[2.5rem] bg-[#211d1a] text-white lg:grid-cols-[1.25fr_.75fr]">
          <div className="p-8 sm:p-12 lg:p-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs tracking-wide">
              <Sparkles size={14} />
              BEAUTY, GROOMING &amp; STYLE
            </div>

            <h1 className="mt-8 max-w-3xl text-5xl font-semibold leading-[.98] tracking-tight sm:text-6xl lg:text-7xl">
              Look good.
              <br />
              <span className="text-[#d8c1aa]">
                Feel even better.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
              A calmer way to book your salon visit.
              Choose your service, stylist and a
              genuinely available time.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/book"
                className="rounded-full bg-white px-6 py-3 font-medium text-neutral-900"
              >
                Book an appointment
                <ArrowRight
                  className="ml-2 inline"
                  size={17}
                />
              </Link>

              <Link
                href="/services"
                className="rounded-full border border-white/15 px-6 py-3"
              >
                Explore services
              </Link>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-2 gap-4 border-t border-white/10 pt-6 text-sm sm:grid-cols-3">
              <div>
                <b>Unisex</b>
                <p className="mt-1 text-white/50">
                  Made for everyone
                </p>
              </div>

              <div>
                <b>Bridal</b>
                <p className="mt-1 text-white/50">
                  Special-day beauty
                </p>
              </div>

              <div>
                <b>100%</b>
                <p className="mt-1 text-white/50">
                  Offline payment
                </p>
              </div>
            </div>
          </div>

          <div className="hidden min-h-[560px] bg-gradient-to-br from-[#b79e88] via-[#8d7767] to-[#4b3f37] p-8 lg:flex lg:flex-col lg:justify-end">
            <div className="rounded-3xl border border-white/20 bg-black/20 p-6 backdrop-blur">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays size={17} />
                Smart availability
              </div>

              <p className="mt-3 text-2xl font-medium">
                Your slot is checked twice.
              </p>

              <p className="mt-2 text-sm text-white/70">
                Working hours, bookings, breaks and
                salon closures are all respected.
              </p>
            </div>
          </div>
        </div>
      </section>

      <HomeGallery />

      {/* EXPERIENCES */}
      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.25em] text-neutral-500">
              Choose your experience
            </p>

            <h2 className="mt-2 text-3xl font-semibold">
              Made for everyone.
            </h2>
          </div>

          <Link
            href="/services"
            className="hidden text-sm underline sm:block"
          >
            View all services
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {experiences.map((experience) => (
            <Link
              key={experience.title}
              href={experience.href}
              className="group rounded-3xl border border-black/5 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="text-xs text-neutral-400">
                {experience.number}
              </span>

              <h3 className="mt-10 text-2xl font-semibold">
                {experience.title}
              </h3>

              <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-500">
                {experience.description}
              </p>

              <span className="mt-8 inline-flex items-center text-sm font-medium">
                Explore
                <ArrowRight
                  className="ml-2 transition group-hover:translate-x-1"
                  size={16}
                />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
