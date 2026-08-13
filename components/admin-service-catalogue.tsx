"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  description?: string | null;
  display_order: number;
  active: boolean;
};

type Option = {
  id?: string;
  name: string;
  price: string | number;
  price_type: "fixed" | "from" | "percentage";
  duration_minutes: string | number;
  display_order?: number;
  active?: boolean;
};

type Service = {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  category_id: string | null;
  category?: string;
  service_categories?: {
    id: string;
    name: string;
    display_order: number;
  } | null;
  service_options?: Option[];
  service_audiences?: {
    audience: string;
  }[];
};

const AUDIENCES = [
  ["men", "Men"],
  ["women", "Women"],
  ["kids", "Kids"],
] as const;

function money(value: number) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function optionLabel(option: Option) {
  if (option.price_type === "from") {
    return `From ${money(Number(option.price))}`;
  }

  if (option.price_type === "percentage") {
    return `${Number(option.price)}%`;
  }

  return money(Number(option.price));
}

export function AdminServiceCatalogue() {
  const [categories, setCategories] = useState<Category[]>(
    []
  );

  const [services, setServices] = useState<Service[]>(
    []
  );

  const [openCategories, setOpenCategories] =
    useState<Record<string, boolean>>({});

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [categoryModal, setCategoryModal] =
    useState(false);

  const [serviceModal, setServiceModal] =
    useState(false);

  const [categoryName, setCategoryName] =
    useState("");

  const [categoryDescription, setCategoryDescription] =
    useState("");

  const [serviceName, setServiceName] =
    useState("");

  const [serviceDescription, setServiceDescription] =
    useState("");

  const [serviceCategory, setServiceCategory] =
    useState("");

  const [audiences, setAudiences] =
    useState<string[]>([]);

  const [options, setOptions] = useState<Option[]>([
    {
      name: "",
      price: "",
      price_type: "fixed",
      duration_minutes: "",
    },
  ]);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [categoryResponse, serviceResponse] =
        await Promise.all([
          fetch(
            "/api/admin/service-categories",
            { cache: "no-store" }
          ),
          fetch(
            "/api/admin/service-catalogue",
            { cache: "no-store" }
          ),
        ]);

      const categoryData =
        await categoryResponse.json();

      const serviceData =
        await serviceResponse.json();

      if (!categoryResponse.ok) {
        throw new Error(
          categoryData.error ||
            "Unable to load categories."
        );
      }

      if (!serviceResponse.ok) {
        throw new Error(
          serviceData.error ||
            "Unable to load services."
        );
      }

      setCategories(categoryData.rows || []);
      setServices(serviceData.rows || []);
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to load service catalogue."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetServiceForm() {
    setServiceName("");
    setServiceDescription("");
    setServiceCategory(
      categories[0]?.id || ""
    );
    setAudiences([]);
    setOptions([
      {
        name: "",
        price: "",
        price_type: "fixed",
        duration_minutes: "",
      },
    ]);
    setError("");
  }

  function openServiceForm() {
    resetServiceForm();
    setServiceModal(true);
  }

  function updateOption(
    index: number,
    field: keyof Option,
    value: string
  ) {
    setOptions((current) =>
      current.map((option, i) =>
        i === index
          ? {
              ...option,
              [field]: value,
            }
          : option
      )
    );
  }

  function addOption() {
    setOptions((current) => [
      ...current,
      {
        name: "",
        price: "",
        price_type: "fixed",
        duration_minutes: "",
      },
    ]);
  }

  function removeOption(index: number) {
    setOptions((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function saveCategory(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");

    if (!categoryName.trim()) {
      setError("Please enter a category name.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/service-categories",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: categoryName,
            description: categoryDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to create category."
        );
      }

      setCategoryModal(false);
      setCategoryName("");
      setCategoryDescription("");

      await load();
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to create category."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveService(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");

    if (!serviceCategory) {
      setError("Please select a category.");
      return;
    }

    if (!serviceName.trim()) {
      setError("Please enter a service name.");
      return;
    }

    if (!audiences.length) {
      setError(
        "Please select at least one audience."
      );
      return;
    }

    if (!options.length) {
      setError(
        "Please add at least one pricing option."
      );
      return;
    }

    for (const option of options) {
      if (!option.name.trim()) {
        setError(
          "Every pricing option needs a name."
        );
        return;
      }

      if (
        option.price === "" ||
        !Number.isFinite(Number(option.price)) ||
        Number(option.price) < 0
      ) {
        setError(
          `Enter a valid price for "${option.name}".`
        );
        return;
      }

      if (
        !Number.isInteger(
          Number(option.duration_minutes)
        ) ||
        Number(option.duration_minutes) <= 0
      ) {
        setError(
          `Enter a valid duration for "${option.name}".`
        );
        return;
      }
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/service-catalogue",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category_id: serviceCategory,
            name: serviceName,
            description: serviceDescription,
            audiences,
            options,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save service."
        );
      }

      setServiceModal(false);

      await load();
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to save service."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredServices = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return services;
    }

    return services.filter((service) => {
      const category =
        service.service_categories?.name || "";

      return (
        service.name
          .toLowerCase()
          .includes(query) ||
        category
          .toLowerCase()
          .includes(query)
      );
    });
  }, [services, search]);

  const categoryServices = (
    categoryId: string
  ) =>
    filteredServices.filter(
      (service) =>
        service.category_id === categoryId
    );

  function toggleCategory(id: string) {
    setOpenCategories((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function toggleAudience(audience: string) {
    setAudiences((current) =>
      current.includes(audience)
        ? current.filter(
            (x) => x !== audience
          )
        : [...current, audience]
    );
  }

  return (
    <div>
      {/* HEADER */}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
            Catalogue
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Services
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-neutral-500">
            Organise services by category, audience,
            price and appointment duration.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setError("");
              setCategoryModal(true);
            }}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
          >
            <Plus
              size={16}
              className="mr-1 inline"
            />
            Category
          </button>

          <button
            type="button"
            onClick={openServiceForm}
            disabled={!categories.length}
            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus
              size={16}
              className="mr-1 inline"
            />
            Add service
          </button>
        </div>
      </div>

      {/* SEARCH */}

      <div className="mt-7 flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
        <Search
          size={18}
          className="text-neutral-400"
        />

        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search services or categories..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {/* ERROR */}

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* LIST */}

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="rounded-3xl border bg-white p-8 text-sm text-neutral-500">
            Loading services...
          </div>
        ) : !categories.length ? (
          <div className="rounded-3xl border bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">
              No categories yet
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Create your first category to start
              building the salon menu.
            </p>

            <button
              type="button"
              onClick={() =>
                setCategoryModal(true)
              }
              className="mt-5 rounded-full bg-neutral-900 px-5 py-2 text-sm text-white"
            >
              Create category
            </button>
          </div>
        ) : (
          categories.map((category) => {
            const items =
              categoryServices(category.id);

            const isOpen =
              openCategories[category.id] ??
              true;

            return (
              <section
                key={category.id}
                className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm"
              >
                {/* CATEGORY HEADER */}
                <div className="flex items-center justify-between gap-4 px-5 py-5">
                  <button
                    type="button"
                    onClick={() =>
                      toggleCategory(category.id)
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <ChevronDown
                        size={19}
                        className="shrink-0"
                      />
                    ) : (
                      <ChevronRight
                        size={19}
                        className="shrink-0"
                      />
                    )}

                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">
                        {category.name}
                      </h2>

                      <p className="mt-1 text-xs text-neutral-500">
                        {items.length}{" "}
                        {items.length === 1
                          ? "service"
                          : "services"}
                      </p>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-xs text-neutral-400 sm:block">
                      {category.active
                        ? "Active"
                        : "Hidden"}
                    </span>

                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed =
                          window.confirm(
                            `Delete category "${category.name}"?`
                          );

                        if (!confirmed) {
                          return;
                        }

                        setError("");

                        try {
                          const response =
                            await fetch(
                              `/api/admin/service-categories?id=${category.id}`,
                              {
                                method: "DELETE",
                              }
                            );

                          const data =
                            await response.json();

                          if (!response.ok) {
                            throw new Error(
                              data.error ||
                                "Unable to delete category."
                            );
                          }

                          await load();
                        } catch (e: any) {
                          setError(
                            e?.message ||
                              "Unable to delete category."
                          );
                        }
                      }}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* SERVICES */}
                {isOpen && (
                  <div className="border-t border-black/5">
                    {!items.length ? (
                      <div className="px-5 py-8">
                        <p className="text-sm text-neutral-500">
                          No services in this category yet.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            resetServiceForm();
                            setServiceCategory(
                              category.id
                            );
                            setServiceModal(true);
                          }}
                          className="mt-4 inline-flex items-center rounded-full bg-neutral-900 px-4 py-2 text-sm text-white transition hover:bg-neutral-800"
                        >
                          <Plus
                            size={15}
                            className="mr-2"
                          />
                          Add service
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-black/5">
                        {items.map((service) => {
                          const serviceAudiences =
                            (
                              service.service_audiences ||
                              []
                            ).map(
                              (x) => x.audience
                            );

                          return (
                            <div
                              key={service.id}
                              className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-medium">
                                    {service.name}
                                  </h3>

                                  {serviceAudiences.map(
                                    (audience) => (
                                      <span
                                        key={audience}
                                        className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] capitalize text-neutral-600"
                                      >
                                        {audience}
                                      </span>
                                    )
                                  )}
                                </div>

                                {service.description && (
                                  <p className="mt-1 max-w-2xl text-sm text-neutral-500">
                                    {service.description}
                                  </p>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {(
                                    service.service_options ||
                                    []
                                  ).map(
                                    (option) => (
                                      <span
                                        key={
                                          option.id ||
                                          option.name
                                        }
                                        className="rounded-xl border border-black/5 bg-neutral-50 px-3 py-2 text-xs"
                                      >
                                        <strong>
                                          {option.name}
                                        </strong>

                                        <span className="mx-1 text-neutral-400">
                                          ·
                                        </span>

                                        {optionLabel(
                                          option
                                        )}

                                        <span className="mx-1 text-neutral-400">
                                          ·
                                        </span>

                                        {
                                          option.duration_minutes
                                        }{" "}
                                        min
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>

                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-neutral-50"
                                  onClick={() =>
                                    alert(
                                      "Service editing will be added next."
                                    )
                                  }
                                >
                                  <Pencil
                                    size={15}
                                    className="mr-1 inline"
                                  />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
                                  onClick={async () => {
                                    const confirmed =
                                      window.confirm(
                                        `Archive "${service.name}"?\n\nIt will disappear from the active service catalogue, but existing appointments will remain safe.`
                                      );

                                    if (!confirmed) {
                                      return;
                                    }

                                    setError("");

                                    try {
                                      const response =
                                        await fetch(
                                          `/api/admin/service-catalogue?id=${service.id}`,
                                          {
                                            method:
                                              "DELETE",
                                          }
                                        );

                                      const data =
                                        await response.json();

                                      if (
                                        !response.ok
                                      ) {
                                        throw new Error(
                                          data.error ||
                                            "Unable to delete service."
                                        );
                                      }

                                      await load();
                                    } catch (
                                      e: any
                                    ) {
                                      setError(
                                        e?.message ||
                                          "Unable to delete service."
                                      );
                                    }
                                  }}
                                >
                                  <Trash2
                                    size={15}
                                    className="mr-1 inline"
                                  />
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        <div className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              resetServiceForm();
                              setServiceCategory(
                                category.id
                              );
                              setServiceModal(true);
                            }}
                            className="inline-flex items-center rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-neutral-50"
                          >
                            <Plus
                              size={15}
                              className="mr-2"
                            />
                            Add service
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

      {/* CATEGORY MODAL */}

      {categoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
          <form
            onSubmit={saveCategory}
            className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                Add category
              </h2>

              <button
                type="button"
                onClick={() =>
                  setCategoryModal(false)
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-7 space-y-4">
              <input
                value={categoryName}
                onChange={(e) =>
                  setCategoryName(e.target.value)
                }
                placeholder="Category name"
                className="w-full rounded-xl border p-3"
                required
              />

              <textarea
                value={categoryDescription}
                onChange={(e) =>
                  setCategoryDescription(
                    e.target.value
                  )
                }
                placeholder="Description (optional)"
                className="min-h-24 w-full rounded-xl border p-3"
              />
            </div>

            <button
              disabled={saving}
              className="mt-6 w-full rounded-xl bg-neutral-900 p-3 text-white disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Create category"}
            </button>
          </form>
        </div>
      )}

      {/* SERVICE MODAL */}

      {serviceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-5">
          <form
  onSubmit={saveService}
  className="mx-auto my-8 w-full max-w-3xl min-w-0 overflow-hidden rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Catalogue
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  Add service
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setServiceModal(false)
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-7 grid gap-5">
              <div>
                <label className="text-sm font-medium">
                  Category
                </label>

                <select
                  value={serviceCategory}
                  onChange={(e) =>
                    setServiceCategory(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border p-3"
                  required
                >
                  <option value="">
                    Select category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Service name
                </label>

                <input
                  value={serviceName}
                  onChange={(e) =>
                    setServiceName(e.target.value)
                  }
                  placeholder="e.g. Haircut with Stylist"
                  className="mt-2 w-full rounded-xl border p-3"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Description{" "}
                  <span className="font-normal text-neutral-400">
                    optional
                  </span>
                </label>

                <textarea
                  value={serviceDescription}
                  onChange={(e) =>
                    setServiceDescription(
                      e.target.value
                    )
                  }
                  placeholder="Brief description of the service"
                  className="mt-2 min-h-24 w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Suitable for
                </label>

                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {AUDIENCES.map(
                    ([value, label]) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                          audiences.includes(value)
                            ? "border-neutral-900 bg-neutral-50"
                            : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={audiences.includes(
                            value
                          )}
                          onChange={() =>
                            toggleAudience(
                              value
                            )
                          }
                          className="h-4 w-4"
                        />

                        <span className="text-sm">
                          {label}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between">
                  <div>
                    <label className="text-sm font-medium">
                      Pricing & timing
                    </label>

                    <p className="mt-1 text-xs text-neutral-500">
                      Duration is used by the
                      appointment availability system.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addOption}
                    className="text-sm font-medium underline"
                  >
                    + Add option
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {options.map(
                    (option, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border bg-neutral-50 p-4"
                      >
<div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)_minmax(0,.9fr)_minmax(0,.8fr)_auto]">                          <input
                            value={option.name}
                            onChange={(e) =>
                              updateOption(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="Option name"
                            className="min-w-0 w-full rounded-xl border bg-white p-3"
                            required
                          />

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              option.price
                            }
                            onChange={(e) =>
                              updateOption(
                                index,
                                "price",
                                e.target.value
                              )
                            }
                            placeholder="Price"
                            className="min-w-0 w-full rounded-xl border bg-white p-3"
                            required
                          />

                          <select
                            value={
                              option.price_type
                            }
                            onChange={(e) =>
                              updateOption(
                                index,
                                "price_type",
                                e.target.value
                              )
                            }
                            className="min-w-0 w-full rounded-xl border bg-white p-3"
                          >
                            <option value="fixed">
                              Fixed
                            </option>

                            <option value="from">
                              From
                            </option>

                            <option value="percentage">
                              Percentage
                            </option>
                          </select>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={
                              option.duration_minutes
                            }
                            onChange={(e) =>
                              updateOption(
                                index,
                                "duration_minutes",
                                e.target.value
                              )
                            }
                            placeholder="Minutes"
                            className="min-w-0 w-full rounded-xl border bg-white p-3"
                            required
                          />

                        <button
  type="button"
  onClick={() => removeOption(index)}
  disabled={options.length === 1}
  className="flex h-12 w-full items-center justify-center rounded-xl border border-red-200 px-3 text-red-600 disabled:opacity-30 sm:w-12"
>
  <Trash2 size={17} />
</button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            <button
              disabled={saving}
              className="mt-7 w-full rounded-xl bg-neutral-900 p-3 text-white disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save service"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
