"use client";

import Link from "next/link";
import { useUserData } from "@/lib/use-user-data";
import { fmtDate } from "@/lib/utils";

export default function PetsPage() {
  const { pets, vaccines, documents, reminders, loading } = useUserData();

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Your Pets</h1>
      <p className="mt-1 text-muted text-sm">
        {pets.length === 0
          ? "Add pets from the PawProof mobile app. They'll show up here automatically."
          : `${pets.length} pet${pets.length === 1 ? "" : "s"} on file.`}
      </p>

      {loading ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Loading…
        </div>
      ) : pets.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <h2 className="font-semibold">No pets yet</h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Open the PawProof iOS app and tap the + button to add your
            first pet. Pets sync to the web automatically.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {pets.map((pet) => {
            const v = vaccines.filter((x) => x.petId === pet.id).length;
            const d = documents.filter((x) => x.petId === pet.id).length;
            const r = reminders.filter((x) => x.petId === pet.id && !x.isCompleted).length;
            return (
              <li
                key={pet.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary text-xl font-bold">
                    {pet.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg">{pet.name}</h2>
                    <div className="text-sm text-muted capitalize">
                      {pet.species}
                      {pet.breed ? ` · ${pet.breed}` : ""}
                      {pet.birthday ? ` · born ${fmtDate(pet.birthday)}` : ""}
                    </div>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <Stat n={v} label="vaccines" />
                  <Stat n={d} label="documents" />
                  <Stat n={r} label="active reminders" />
                </dl>

                {pet.notes ? (
                  <p className="mt-4 text-sm text-muted line-clamp-3">{pet.notes}</p>
                ) : null}

                <div className="mt-4 flex gap-2">
                  <Link
                    href="/dashboard/records"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Records →
                  </Link>
                  <Link
                    href="/dashboard/reminders"
                    className="ml-auto text-xs font-semibold text-primary hover:underline"
                  >
                    Reminders →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg bg-surface-elevated py-2.5">
      <div className="font-bold">{n}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
