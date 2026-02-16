import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  getImprovementHistory,
  getImprovementRequests,
} from "@/lib/actions/improvements";
import { ImprovementsClient } from "./ImprovementsClient";

export default async function ImprovementsPage() {
  const [requests, history] = await Promise.all([
    getImprovementRequests(),
    getImprovementHistory(),
  ]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="pen-container pen-fade-in pt-14 pb-8">
          <h1 className="mb-8 text-center text-2xl font-bold">改善計画</h1>
          <ImprovementsClient
            initialRequests={requests}
            initialHistory={history}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
