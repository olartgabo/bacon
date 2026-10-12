import type { Metadata } from "next";
import { BaconAppIcon } from "@/design/brand";

export const metadata: Metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <main className="shell flex flex-col items-center py-24 text-center">
      <BaconAppIcon size={56} />
      <h1 className="t-display mt-6">Not invited yet</h1>
      <p className="t-meta mt-3 max-w-[48ch]">
        You signed in, but this email has no bacon identity. Ask Gabriel to add you as a requester.
      </p>
    </main>
  );
}
