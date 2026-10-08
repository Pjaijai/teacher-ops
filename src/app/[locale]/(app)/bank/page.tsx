import { Suspense } from "react";
import { BankPage } from "@/features/bank/components/bank-page";

export default function Page() {
  return (
    <Suspense>
      <BankPage />
    </Suspense>
  );
}
