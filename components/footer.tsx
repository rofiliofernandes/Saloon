import Link from "next/link";
import {
  ChevronRight,
  MapPin,
  Phone,
} from "lucide-react";

const GOOGLE_MAPS_URL =
  "https://maps.app.goo.gl/5BaBN8AmQQUdAM767?g_st=iw";

const INSTAGRAM_URL =
  "https://www.instagram.com/ak_hairbeautysalon/";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[#b8892e]/25 bg-[#faf7f1]">

      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">

        <div className="grid gap-14 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">

          {/* BRAND */}
          <div>
            <Link
              href="/"
              className="inline-flex flex-col items-center sm:items-start"
            >
              <div className="relative flex h-[92px] w-[125px] items-end justify-center">

                <div className="absolute left-1/2 top-0 -translate-x-1/2 text-[42px] leading-none text-[#b8892e]">
                  ♕
                </div>

                <span className="mb-1 font-serif text-[58px] font-semibold leading-none tracking-[-0.2em] text-[#a87820]">
                  AK
                </span>

              </div>

              <div className="mt-2 text-center sm:text-left">

                <p className="font-serif text-xl tracking-[0.04em] text-neutral-900">
                  AK HAIR &amp; BEAUTY SALON
                </p>

                <div className="mt-4 flex items-center justify-center gap-3 sm:justify-start">
                  <span className="h-px w-12 bg-[#b8892e]/60" />
                  <span className="h-2 w-2 rotate-45 bg-[#b8892e]" />
                  <span className="h-px w-12 bg-[#b8892e]/60" />
                </div>

              </div>
            </Link>

            <p className="mt-7 max-w-sm text-center text-sm leading-7 text-neutral-500 sm:text-left">
              Beauty, style and care — all in one place.
              Book your next salon appointment online
              or visit us at the salon.
            </p>
          </div>


          {/* EXPLORE */}
          <div>
            <h2 className="font-serif text-lg tracking-[0.14em] text-[#9d7222]">
              EXPLORE
            </h2>

            <div className="mt-3 h-px w-14 bg-[#b8892e]/60" />

            <nav className="mt-6 flex flex-col gap-4 text-sm text-neutral-600">

              <Link
                href="/services"
                className="flex items-center gap-2 transition hover:text-[#9d7222]"
              >
                <ChevronRight size={15} className="text-[#b8892e]" />
                Services
              </Link>

              <Link
                href="/stylists"
                className="flex items-center gap-2 transition hover:text-[#9d7222]"
              >
                <ChevronRight size={15} className="text-[#b8892e]" />
                Stylists
              </Link>

              <Link
                href="/book"
                className="flex items-center gap-2 transition hover:text-[#9d7222]"
              >
                <ChevronRight size={15} className="text-[#b8892e]" />
                Book appointment
              </Link>

              <Link
                href="/appointments"
                className="flex items-center gap-2 transition hover:text-[#9d7222]"
              >
                <ChevronRight size={15} className="text-[#b8892e]" />
                My appointments
              </Link>

            </nav>
          </div>


          {/* SALON */}
          <div>
            <h2 className="font-serif text-lg tracking-[0.14em] text-[#9d7222]">
              SALON
            </h2>

            <div className="mt-3 h-px w-14 bg-[#b8892e]/60" />

            <nav className="mt-6 flex flex-col gap-4 text-sm text-neutral-600">

              <Link
                href="/about"
                className="flex items-center gap-2 transition hover:text-[#9d7222]"
              >
                <ChevronRight size={15} className="text-[#b8892e]" />
                About us
              </Link>

              <Link
                href="/contact"
                className="flex items-center gap-2 transition hover:text-[#9d7222]"
              >
                <ChevronRight size={15} className="text-[#b8892e]" />
                Contact us
              </Link>

              <Link
                href="/terms"
                className="flex items-center gap-2 transition hover:text-[#9d7222]"
              >
                <ChevronRight size={15} className="text-[#b8892e]" />
                Terms of Service
              </Link>

              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 transition hover:text-[#9d7222]"
              >
                <ChevronRight size={15} className="text-[#b8892e]" />
                Find us on Google Maps
              </a>

              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 transition hover:text-[#9d7222]"
              >
                <ChevronRight size={15} className="text-[#b8892e]" />
                Instagram
              </a>

            </nav>
          </div>


          {/* CONTACT */}
          <div>

            <h2 className="font-serif text-lg tracking-[0.14em] text-[#9d7222]">
              CONTACT
            </h2>

            <div className="mt-3 h-px w-14 bg-[#b8892e]/60" />


            <div className="mt-6 space-y-6">

              {/* PHONE */}
              <div className="flex items-center gap-4">

                <a
                  href="tel:+918191014503"
                  aria-label="Call AK Hair & Beauty Salon"
                  className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b8892e] text-[#a87820] transition hover:bg-[#b8892e] hover:text-white"
                >
                  <Phone
                    size={19}
                    strokeWidth={1.5}
                  />
                </a>

                <div>
                  <p className="text-sm font-medium text-[#9d7222]">
                    Phone
                  </p>

                  <a
                    href="tel:+918191014503"
                    className="mt-1 block text-sm text-neutral-700 transition hover:text-[#9d7222]"
                  >
                    +91 81910 14503
                  </a>
                </div>

              </div>


              {/* INSTAGRAM */}
              <div className="flex items-center gap-4">

                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="AK Hair & Beauty Salon on Instagram"
                  className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b8892e] text-[#a87820] transition hover:bg-[#b8892e] hover:text-white"
                >

                  {/* Instagram icon */}
                  <span className="relative block h-[20px] w-[20px] rounded-[6px] border-[1.8px] border-current">

                    <span className="absolute left-1/2 top-1/2 h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.6px] border-current" />

                    <span className="absolute right-[2.5px] top-[2.5px] h-[3px] w-[3px] rounded-full bg-current" />

                  </span>

                </a>

                <div>

                  <p className="text-sm font-medium text-[#9d7222]">
                    Instagram
                  </p>

                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-sm text-neutral-700 transition hover:text-[#9d7222]"
                  >
                    @ak_hairbeautysalon
                  </a>

                </div>

              </div>


              {/* LOCATION */}
              <div className="flex items-center gap-4">

                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Get directions to AK Hair & Beauty Salon"
                  className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b8892e] text-[#a87820] transition hover:bg-[#b8892e] hover:text-white"
                >
                  <MapPin
                    size={19}
                    strokeWidth={1.5}
                  />
                </a>

                <div>

                  <p className="text-sm font-medium text-[#9d7222]">
                    Visit us
                  </p>

                  <a
                    href={GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-sm text-neutral-700 underline underline-offset-4 transition hover:text-[#9d7222]"
                  >
                    Get directions
                  </a>

                </div>

              </div>

            </div>
          </div>

        </div>
      </div>


      {/* COPYRIGHT */}
      <div className="border-t border-[#b8892e]/25">

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">

          <p>
            © {new Date().getFullYear()} AK Hair &amp; Beauty Salon.
            All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-4">

            <Link
              href="/terms"
              className="transition hover:text-[#9d7222]"
            >
              Terms of Service
            </Link>

            <span className="text-[#b8892e]">•</span>

            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[#9d7222]"
            >
              Instagram
            </a>

            <span className="text-[#b8892e]">•</span>

            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[#9d7222]"
            >
              Google Maps
            </a>

          </div>

        </div>
      </div>

    </footer>
  );
}
