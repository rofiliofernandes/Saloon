"use client";

import { jsPDF } from "jspdf";
import { useEffect, useMemo, useState } from "react";

type Range =
  | "today"
  | "week"
  | "month"
  | "year"
  | "custom";

type Report = {
  summary: {
    revenue: number;
    grossRevenue: number;
    discounts: number;
    customers: number;
    appointments: number;
  };

  stylists: {
    stylistId: string;
    stylistName: string;
    customers: number;
    appointments: number;
    revenue: number;
    discounts: number;
  }[];

  daily: {
    date: string;
    customers: number;
    appointments: number;
    revenue: number;
    discounts: number;
  }[];

  transactions: {
    id: string;
    date: string;
    customer: string;
    phone: string;
    stylist: string;
    service: string;
    basePrice: number;
    discount: number;
    revenue: number;
    coupon: string;
    bookingSource: string;
    status: string;
  }[];
};

function money(
  value: number
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(value);
}

function dateLabel(
  value: string
) {
  return new Date(
    value
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone:
        "Asia/Kolkata",
    }
  );
}

export default function AdminReports() {
  const [range, setRange] =
    useState<Range>("month");

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");

  const [report, setReport] =
    useState<Report | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [sortBy, setSortBy] =
    useState<
      "revenue" | "customers"
    >("revenue");

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const params =
        new URLSearchParams();

      params.set(
        "range",
        range
      );

      if (
        range === "custom"
      ) {
        if (!from || !to) {
          setError(
            "Choose both start and end dates."
          );
          return;
        }

        params.set(
          "from",
          from
        );

        params.set(
          "to",
          to
        );
      }

      const response =
        await fetch(
          `/api/admin/reports?${params}`,
          {
            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load report."
        );
      }

      setReport(data);
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to load report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      range !== "custom"
    ) {
      loadReport();
    }
  }, [range]);

  const sortedStylists =
    useMemo(() => {
      if (!report) {
        return [];
      }

      return [
        ...report.stylists,
      ].sort((a, b) =>
        sortBy ===
        "revenue"
          ? b.revenue -
            a.revenue
          : b.customers -
            a.customers
      );
    }, [
      report,
      sortBy,
    ]);

  function downloadCsv() {
    if (!report) return;

    const header = [
      "Date",
      "Customer",
      "Phone",
      "Stylist",
      "Service",
      "Base Price",
      "Discount",
      "Revenue",
      "Coupon",
      "Booking Source",
      "Status",
      "Appointment ID",
    ];

    const rows =
      report.transactions.map(
        (item) => [
          item.date,
          item.customer,
          item.phone,
          item.stylist,
          item.service,
          item.basePrice,
          item.discount,
          item.revenue,
          item.coupon,
          item.bookingSource,
          item.status,
          item.id,
        ]
      );

    const escape = (
      value: unknown
    ) =>
      `"${String(
        value ?? ""
      ).replace(
        /"/g,
        '""'
      )}"`;

    const csv = [
      header
        .map(escape)
        .join(","),
      ...rows.map((row) =>
        row
          .map(escape)
          .join(",")
      ),
    ].join("\n");

    const blob =
      new Blob(
        [csv],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href = url;

    anchor.download =
      `salon-transactions-${range}.csv`;

    anchor.click();

    URL.revokeObjectURL(
      url
    );
  }

  function downloadPdf() {
    if (!report) return;

    const doc =
      new jsPDF({
        orientation:
          "portrait",
        unit: "mm",
        format: "a4",
      });

    const width =
      doc.internal.pageSize.getWidth();

    const height =
      doc.internal.pageSize.getHeight();

    const margin = 15;

    let y = 18;

    function space(
      amount = 8
    ) {
      if (
        y + amount >
        height - 15
      ) {
        doc.addPage();
        y = 18;
      }
    }

    function heading(
      text: string
    ) {
      space(12);

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(14);

      doc.text(
        text,
        margin,
        y
      );

      y += 8;
    }

    function line(
      text: string
    ) {
      space(6);

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(9);

      doc.text(
        text,
        margin,
        y
      );

      y += 5;
    }

    function pdfMoney(
      value: number
    ) {
      return `Rs. ${Math.round(
        value
      ).toLocaleString(
        "en-IN"
      )}`;
    }

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(22);

    doc.text(
      "AK Hair & Beauty Salon",
      margin,
      y
    );

    y += 9;

    doc.setFontSize(15);

    doc.text(
      "Business Revenue Report",
      margin,
      y
    );

    y += 7;

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.text(
      `Period: ${range === "custom" ? `${from} to ${to}` : range}`,
      margin,
      y
    );

    y += 12;

    heading(
      "Financial Summary"
    );

    line(
      `Gross Revenue: ${pdfMoney(
        report.summary.grossRevenue
      )}`
    );

    line(
      `Discounts: ${pdfMoney(
        report.summary.discounts
      )}`
    );

    line(
      `Net Revenue: ${pdfMoney(
        report.summary.revenue
      )}`
    );

    line(
      `Customer Visits: ${report.summary.customers}`
    );

    line(
      `Completed Appointments: ${report.summary.appointments}`
    );

    y += 5;

    heading(
      "Stylist Performance"
    );

    for (
      const stylist of sortedStylists
    ) {
      line(
        `${stylist.stylistName} — ${stylist.customers} visits — ${stylist.appointments} appointments — ${pdfMoney(stylist.revenue)}`
      );
    }

    y += 5;

    heading(
      "Revenue by Day"
    );

    for (
      const day of report.daily
    ) {
      line(
        `${day.date} — ${day.customers} visits — ${pdfMoney(day.revenue)}`
      );
    }

    y += 5;

    heading(
      "Transactions"
    );

    for (
      const transaction of report.transactions
    ) {
      space(22);

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(8);

      doc.text(
        `${dateLabel(
          transaction.date
        )} — ${transaction.customer}`,
        margin,
        y
      );

      y += 4;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.text(
        `Stylist: ${transaction.stylist}`,
        margin,
        y
      );

      y += 4;

      doc.text(
        `Service: ${transaction.service}`,
        margin,
        y
      );

      y += 4;

      doc.text(
        `Base: ${pdfMoney(transaction.basePrice)} | Discount: ${pdfMoney(transaction.discount)} | Revenue: ${pdfMoney(transaction.revenue)}`,
        margin,
        y
      );

      y += 6;
    }

    const pages =
      doc.getNumberOfPages();

    for (
      let page = 1;
      page <= pages;
      page++
    ) {
      doc.setPage(page);

      doc.setFontSize(7);

      doc.text(
        `AK Hair & Beauty Salon — Page ${page} of ${pages}`,
        width / 2,
        height - 8,
        {
          align:
            "center",
        }
      );
    }

    doc.save(
      `ak-salon-revenue-${range}.pdf`
    );
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">
              Business intelligence
            </p>

            <h2 className="mt-2 text-3xl font-semibold">
              Salon Revenue
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Revenue, customer visits and
              stylist performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={
                downloadCsv
              }
              disabled={
                !report
              }
              className="rounded-xl border px-4 py-2.5 text-sm"
            >
              Download CSV
            </button>

            <button
              type="button"
              onClick={
                downloadPdf
              }
              disabled={
                !report
              }
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm text-white"
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(
            [
              ["today", "Today"],
              ["week", "This Week"],
              ["month", "This Month"],
              ["year", "This Year"],
              ["custom", "Custom"],
            ] as [
              Range,
              string
            ][]
          ).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setRange(
                    value
                  )
                }
                className={`rounded-xl px-4 py-2 text-sm ${
                  range === value
                    ? "bg-neutral-900 text-white"
                    : "border"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {range ===
          "custom" && (
          <div className="mt-5 flex flex-wrap gap-3">
            <input
              type="date"
              value={from}
              onChange={(e) =>
                setFrom(
                  e.target.value
                )
              }
              className="rounded-xl border px-4 py-3"
            />

            <input
              type="date"
              value={to}
              onChange={(e) =>
                setTo(
                  e.target.value
                )
              }
              className="rounded-xl border px-4 py-3"
            />

            <button
              type="button"
              onClick={
                loadReport
              }
              className="rounded-xl bg-neutral-900 px-5 py-3 text-sm text-white"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border bg-white p-8 text-sm text-neutral-500">
          Loading revenue...
        </div>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric
              title="Net Revenue"
              value={money(
                report.summary.revenue
              )}
              dark
            />

            <Metric
              title="Gross Revenue"
              value={money(
                report.summary.grossRevenue
              )}
            />

            <Metric
              title="Discounts"
              value={money(
                report.summary.discounts
              )}
            />

            <Metric
              title="Customer Visits"
              value={String(
                report.summary.customers
              )}
            />

            <Metric
              title="Appointments"
              value={String(
                report.summary.appointments
              )}
            />
          </div>

          <div className="rounded-3xl border bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold">
                  Employee Performance
                </h3>

                <p className="mt-1 text-sm text-neutral-500">
                  Sort by money made or customer
                  visits.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSortBy(
                      "revenue"
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-xs ${
                    sortBy ===
                    "revenue"
                      ? "bg-neutral-900 text-white"
                      : "border"
                  }`}
                >
                  Sort Revenue
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSortBy(
                      "customers"
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-xs ${
                    sortBy ===
                    "customers"
                      ? "bg-neutral-900 text-white"
                      : "border"
                  }`}
                >
                  Sort Customers
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-neutral-50 text-xs uppercase text-neutral-400">
                  <tr>
                    <th className="px-6 py-4">
                      Stylist
                    </th>

                    <th className="px-6 py-4">
                      Customers
                    </th>

                    <th className="px-6 py-4">
                      Appointments
                    </th>

                    <th className="px-6 py-4">
                      Discounts
                    </th>

                    <th className="px-6 py-4 text-right">
                      Revenue
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {sortedStylists.map(
                    (stylist) => (
                      <tr
                        key={
                          stylist.stylistId
                        }
                      >
                        <td className="px-6 py-4 font-medium">
                          {
                            stylist.stylistName
                          }
                        </td>

                        <td className="px-6 py-4">
                          {
                            stylist.customers
                          }
                        </td>

                        <td className="px-6 py-4">
                          {
                            stylist.appointments
                          }
                        </td>

                        <td className="px-6 py-4">
                          {money(
                            stylist.discounts
                          )}
                        </td>

                        <td className="px-6 py-4 text-right font-semibold">
                          {money(
                            stylist.revenue
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border bg-white shadow-sm">
            <div className="border-b p-6">
              <h3 className="text-xl font-semibold">
                Revenue by Day
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-neutral-50 text-xs uppercase text-neutral-400">
                  <tr>
                    <th className="px-6 py-4">
                      Date
                    </th>

                    <th className="px-6 py-4">
                      Customers
                    </th>

                    <th className="px-6 py-4">
                      Appointments
                    </th>

                    <th className="px-6 py-4 text-right">
                      Revenue
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {report.daily.map(
                    (day) => (
                      <tr
                        key={
                          day.date
                        }
                      >
                        <td className="px-6 py-4">
                          {
                            day.date
                          }
                        </td>

                        <td className="px-6 py-4">
                          {
                            day.customers
                          }
                        </td>

                        <td className="px-6 py-4">
                          {
                            day.appointments
                          }
                        </td>

                        <td className="px-6 py-4 text-right font-semibold">
                          {money(
                            day.revenue
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function Metric({
  title,
  value,
  dark = false,
}: {
  title: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-6 ${
        dark
          ? "bg-neutral-900 text-white"
          : "bg-white"
      }`}
    >
      <p className="text-xs uppercase tracking-wider opacity-50">
        {title}
      </p>

      <p className="mt-3 text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}
