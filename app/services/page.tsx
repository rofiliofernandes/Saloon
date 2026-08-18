import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type ServiceOption = {
  id: string;
  name: string;
  price: number;
  price_type: "fixed" | "from" | "percentage";
  duration_minutes: number;
  display_order: number;
  active?: boolean;
};

type ServiceCategory = {
  id: string;
  name: string;
  display_order: number;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  service_categories:
    | ServiceCategory
    | ServiceCategory[]
    | null;
  service_options: ServiceOption[];
  service_audiences: {
    audience: string;
  }[];
};

function getCategory(
  value:
    | ServiceCategory
    | ServiceCategory[]
    | null
    | undefined
): ServiceCategory | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function formatPrice(option: ServiceOption) {
  const price = Number(option.price);

  if (option.price_type === "from") {
    return `₹${price.toLocaleString("en-IN")} onwards`;
  }

  if (option.price_type === "percentage") {
    return `${price}%`;
  }

  return `₹${price.toLocaleString("en-IN")}`;
}

function formatAudience(
  audiences: { audience: string }[]
) {
  return audiences
    .map((item) => {
      const value = item.audience.toLowerCase();

      if (value === "men") return "Men";
      if (value === "women") return "Women";
      if (value === "kids") return "Kids";

      return item.audience;
    })
    .join(" · ");
}

export default async function Services({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    highlight?: string;
  }>;
}) {
  const params = await searchParams;

  const selectedCategory =
    params.category?.trim().toLowerCase() || "";

  const highlight =
    params.highlight === "1";

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select(`
      id,
      name,
      description,
      category_id,
      service_categories (
        id,
        name,
        display_order
      ),
      service_options (
        id,
        name,
        price,
        price_type,
        duration_minutes,
        display_order,
        active
      ),
      service_audiences (
        audience
      )
    `)
    .eq("active", true)
    .is("deleted_at", null)
    .order("name");

  if (error) {
    throw error;
  }

  let services =
    (data ?? []) as unknown as Service[];

  /*
   * Remove services that do not belong
   * to a catalogue category.
   */
  services = services.filter((service) => {
    return Boolean(getCategory(service.service_categories));
  });

  /*
   * Customer-facing filters.
   *
   * "unisex" shows the normal catalogue.
   *
   * "bridal" is reserved for bridal services.
   */
  if (selectedCategory === "bridal") {
    services = services.filter((service) => {
      const category = getCategory(
        service.service_categories
      );

      return (
        category?.name
          .toLowerCase()
          .includes("bridal") ||
        service.name
          .toLowerCase()
          .includes("bridal")
      );
    });
  }

  /*
   * Sort by catalogue category,
   * then service name.
   */
  services.sort((a, b) => {
    const categoryA =
      getCategory(a.service_categories)
        ?.display_order ?? 0;

    const categoryB =
      getCategory(b.service_categories)
        ?.display_order ?? 0;

    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }

    return a.name.localeCompare(b.name);
  });

  /*
   * Group services by catalogue category.
   */
  const grouped = services.reduce<
    Record<string, Service[]>
  >((groups, service) => {
    const category =
      getCategory(service.service_categories);

    const categoryName =
      category?.name || "Other Services";

    if (!groups[categoryName]) {
      groups[categoryName] = [];
    }

    groups[categoryName].push(service);

    return groups;
  }, {});

  const groupedEntries =
    Object.entries(grouped);

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:py-12 lg:px-8 lg:py-16">
      {/* HEADER */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
          Menu
        </p>

        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Services
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
          Explore our services, pricing and appointment
          durations.
        </p>
      </div>

      {/* CUSTOMER CATEGORY CHOICES */}
      <div className="mt-7 flex flex-wrap gap-2">
        <Link
          href="/services"
          className={`rounded-full border px-5 py-2.5 text-sm font-medium transition ${
            selectedCategory !== "bridal"
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-black/10 bg-white text-neutral-700 hover:border-neutral-400"
          }`}
        >
          Unisex
        </Link>

        <Link
          href="/services?category=bridal&highlight=1"
          className={`rounded-full border px-5 py-2.5 text-sm font-medium transition ${
            selectedCategory === "bridal"
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-black/10 bg-white text-neutral-700 hover:border-neutral-400"
          }`}
        >
          Bridal
        </Link>
      </div>

      {/* SERVICES */}
      {!services.length ? (
        <div className="mt-8 rounded-3xl border border-black/10 bg-white p-10 text-center">
          <h2 className="text-xl font-semibold">
            No services available
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            {selectedCategory === "bridal"
              ? "Bridal services have not been added yet."
              : "Please check back soon."}
          </p>

          {selectedCategory === "bridal" && (
            <Link
              href="/services"
              className="mt-5 inline-flex rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white"
            >
              View all services
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {groupedEntries.map(
            ([categoryName, categoryServices], index) => {
              /*
               * When Bridal is selected, open Bridal.
               *
               * Otherwise the first catalogue category
               * is open and the rest stay collapsed.
               */
              const isBridal =
                categoryName
                  .toLowerCase()
                  .includes("bridal");

              const shouldOpen =
                selectedCategory === "bridal"
                  ? isBridal
                  : index === 0;

              return (
                <details
                  key={categoryName}
                  name="service-category"
                  open={shouldOpen}
                  className={`group overflow-hidden rounded-3xl border border-black/10 bg-white ${
                    highlight && isBridal
                      ? "bridal-highlight"
                      : ""
                  }`}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 sm:px-7">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold sm:text-lg">
                        {categoryName}
                      </h2>

                      <p className="mt-1 text-xs text-neutral-500">
                        {categoryServices.length}{" "}
                        {categoryServices.length === 1
                          ? "service"
                          : "services"}
                      </p>
                    </div>

                    <ChevronDown
                      size={20}
                      className="shrink-0 text-neutral-500 transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>

                  <div className="border-t border-black/5 px-4 pb-4 pt-4 sm:px-5">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {categoryServices.map(
                        (service) => {
                          const options = [
                            ...(service.service_options ||
                              []),
                          ]
                            .filter(
                              (option) =>
                                option.active !== false
                            )
                            .sort(
                              (a, b) =>
                                (a.display_order ?? 0) -
                                (b.display_order ?? 0)
                            );

                          const audiences =
                            formatAudience(
                              service.service_audiences ||
                                []
                            );

                          const firstOption =
                            options[0];

                          return (
                            <Link
                              key={service.id}
                              href={`/book?service_id=${encodeURIComponent(
                                service.id
                              )}`}
                              className="group/card rounded-2xl border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="text-base font-semibold leading-6">
                                  {service.name}
                                </h3>

                                {firstOption && (
                                  <span className="shrink-0 text-sm font-medium">
                                    {options.length ===
                                    1
                                      ? formatPrice(
                                          firstOption
                                        )
                                      : `From ${formatPrice(
                                          firstOption
                                        )}`}
                                  </span>
                                )}
                              </div>

                              {service.description && (
                                <p className="mt-2 text-sm leading-5 text-neutral-500">
                                  {
                                    service.description
                                  }
                                </p>
                              )}

                              {options.length ===
                              1 ? (
                                <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-500">
                                  <span>
                                    {
                                      firstOption
                                        ?.duration_minutes
                                    }{" "}
                                    min
                                  </span>

                                  {audiences && (
                                    <>
                                      <span className="text-neutral-300">
                                        ·
                                      </span>

                                      <span>
                                        {audiences}
                                      </span>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-4 space-y-1.5">
                                  {options.map(
                                    (option) => (
                                      <div
                                        key={
                                          option.id
                                        }
                                        className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs"
                                      >
                                        <span className="min-w-0 truncate">
                                          {
                                            option.name
                                          }{" "}
                                          ·{" "}
                                          {
                                            option.duration_minutes
                                          }{" "}
                                          min
                                        </span>

                                        <span className="shrink-0 font-medium">
                                          {formatPrice(
                                            option
                                          )}
                                        </span>
                                      </div>
                                    )
                                  )}

                                  {audiences && (
                                    <p className="pt-1 text-xs text-neutral-500">
                                      Suitable for{" "}
                                      {audiences}
                                    </p>
                                  )}
                                </div>
                              )}

                              <div className="mt-5 inline-flex items-center text-xs font-medium text-neutral-700">
                                Book this service
                                <ArrowRight
                                  size={14}
                                  className="ml-1.5 transition-transform group-hover/card:translate-x-1"
                                />
                              </div>
                            </Link>
                          );
                        }
                      )}
                    </div>
                  </div>
                </details>
              );
            }
          )}
        </div>
      )}
    </main>
  );
}
