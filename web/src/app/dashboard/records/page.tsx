"use client";

import { useMemo } from "react";
import { useUserData } from "@/lib/use-user-data";
import { daysUntil } from "@/lib/dates";
import { fmtDate } from "@/lib/utils";

export default function RecordsPage() {
  const { pets, vaccines, documents, loading } = useUserData();

  const petGroups = useMemo(() => {
    return pets
      .map((pet) => ({
        pet,
        vaccines: vaccines
          .filter((v) => v.petId === pet.id)
          .sort((a, b) => +new Date(b.dateGiven) - +new Date(a.dateGiven)),
        documents: documents
          .filter((d) => d.petId === pet.id)
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
      }))
      .filter((g) => g.vaccines.length > 0 || g.documents.length > 0);
  }, [pets, vaccines, documents]);

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Records</h1>
      <p className="mt-1 text-muted text-sm">
        Vaccines and documents for every pet on your account. Add or scan
        new ones from the mobile app.
      </p>

      {loading ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading…
        </div>
      ) : petGroups.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <h2 className="font-semibold">No records yet</h2>
          <p className="mt-2 text-sm text-muted">
            Use Smart Scan in the mobile app to capture vaccine cards and
            invoices automatically.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {petGroups.map(({ pet, vaccines: vs, documents: ds }) => (
            <section key={pet.id}>
              <div className="flex items-center gap-3 border-b border-border pb-3 mb-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary font-bold">
                  {pet.name?.[0]?.toUpperCase() ?? "?"}
                </span>
                <div>
                  <h2 className="font-bold text-lg">{pet.name}</h2>
                  <div className="text-xs text-muted">
                    {vs.length} vaccines · {ds.length} documents
                  </div>
                </div>
              </div>

              {vs.length > 0 ? (
                <div className="mb-6">
                  <div className="text-xs uppercase tracking-wider text-faint font-semibold mb-2">
                    Vaccinations · {vs.length}
                  </div>
                  <ul className="rounded-xl border border-border bg-surface divide-y divide-divider">
                    {vs.map((v) => {
                      const days = v.expirationDate ? daysUntil(v.expirationDate) : null;
                      const badge =
                        days == null
                          ? null
                          : days < 0
                            ? { text: "Expired", cls: "bg-danger-soft text-danger" }
                            : days <= 30
                              ? { text: `${days}d left`, cls: "bg-warning-soft text-warning" }
                              : { text: `${days}d`, cls: "bg-primary-soft text-primary-dark" };
                      return (
                        <li key={v.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{v.vaccineName}</div>
                            <div className="text-xs text-muted truncate">
                              Given {fmtDate(v.dateGiven)}
                              {v.expirationDate ? ` · expires ${fmtDate(v.expirationDate)}` : ""}
                              {v.clinicName ? ` · ${v.clinicName}` : ""}
                            </div>
                          </div>
                          {badge ? (
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${badge.cls}`}
                            >
                              {badge.text}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {ds.length > 0 ? (
                <div>
                  <div className="text-xs uppercase tracking-wider text-faint font-semibold mb-2">
                    Documents · {ds.length}
                  </div>
                  <ul className="rounded-xl border border-border bg-surface divide-y divide-divider">
                    {ds.map((d) => (
                      <li key={d.id} className="px-4 py-3 flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-warning-soft text-warning text-base">
                          📄
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{d.title}</div>
                          <div className="text-xs text-muted truncate capitalize">
                            {d.kind.replace("_", " ")} · {fmtDate(d.createdAt)}
                          </div>
                        </div>
                        {d.fileUrl ? (
                          <a
                            href={d.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Open
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
