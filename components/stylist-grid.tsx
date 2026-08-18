"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

type Stylist = {
  id: string;
  name: string;
  bio?: string | null;
  category: string;
  image_url?: string | null;
};

function stylistImage(stylist: Stylist) {
  if (stylist.image_url) return stylist.image_url;
  const slug = stylist.name.trim().toLowerCase().replace(/\s+/g, "-");
  const known = new Set(["arjun", "maya", "alex"]);
  return known.has(slug) ? `/stylists/${slug}.svg` : "/stylists/placeholder.svg";
}

export default function StylistGrid({ stylists }: { stylists: Stylist[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {stylists.map((stylist) => {
        const isOpen = openId === stylist.id;

        return (
          <article
            key={stylist.id}
            className={`overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-lg ${isOpen ? "shadow-lg" : ""}`}
          >
            <button
              type="button"
              onClick={() => setOpenId((current) => (current === stylist.id ? null : stylist.id))}
              aria-expanded={isOpen}
              className="block w-full text-left"
            >
              <div className="aspect-square overflow-hidden bg-neutral-100">
                <img
                  src={stylistImage(stylist)}
                  alt={`${stylist.name}, stylist at AK Hair & Beauty Salon`}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
              </div>

              <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight">{stylist.name}</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {stylist.category === "unisex" ? "Hair & beauty stylist" : "Hair & beauty specialist"}
                  </p>
                </div>

                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 text-neutral-500 transition duration-200 ${isOpen ? "rotate-180" : ""}`}>
                  <ChevronDown size={18} />
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-black/5 px-5 pb-6 pt-5 sm:px-6">
                <p className="text-sm leading-6 text-neutral-600">
                  {stylist.bio || "Experienced in creating a comfortable, tailored salon experience."}
                </p>

                <div className="mt-5 rounded-xl bg-[#f8f4ef] px-4 py-3 text-sm">
                  <span className="text-neutral-500">Specialty</span>
                  <span className="ml-2 font-medium text-neutral-800">
                    {stylist.category === "unisex" ? "All clients" : "Personalised styling"}
                  </span>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
