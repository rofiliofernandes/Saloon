"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=85",
    eyebrow: "THE SALON",
    title: "A space made for slowing down.",
  },
  {
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1400&q=85",
    eyebrow: "THE EXPERIENCE",
    title: "Come in feeling ordinary. Leave feeling refreshed.",
  },
  {
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1400&q=85",
    eyebrow: "THE CRAFT",
    title: "Careful work, from the first consultation to the finish.",
  },
];

export default function HomeGallery() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[index];

  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
      <div className="relative min-h-[420px] overflow-hidden rounded-[2.5rem] bg-neutral-900 text-white shadow-sm sm:min-h-[500px]">
        {slides.map((item, slideIndex) => (
          <div
            key={item.image}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              slideIndex === index ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url("${item.image}")` }}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />

        <div className="relative flex min-h-[420px] flex-col justify-end p-7 sm:min-h-[500px] sm:p-10 lg:p-14">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.3em] text-white/70">
              {slide.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
              {slide.title}
            </h2>
          </div>

          <div className="mt-8 flex items-center justify-between gap-5">
            <div className="flex gap-2">
              {slides.map((item, dotIndex) => (
                <button
                  key={item.image}
                  type="button"
                  aria-label={`Show gallery image ${dotIndex + 1}`}
                  onClick={() => setIndex(dotIndex)}
                  className={`h-1.5 rounded-full transition-all ${dotIndex === index ? "w-10 bg-white" : "w-5 bg-white/40"}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous gallery image"
                onClick={() => setIndex((index - 1 + slides.length) % slides.length)}
                className="rounded-full border border-white/30 bg-black/20 p-3 backdrop-blur transition hover:bg-white/15"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Next gallery image"
                onClick={() => setIndex((index + 1) % slides.length)}
                className="rounded-full border border-white/30 bg-black/20 p-3 backdrop-blur transition hover:bg-white/15"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
