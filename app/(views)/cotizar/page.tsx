import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicFooter, PublicHeader } from "../components/public-header";
import QuoteForm from "./quote-form";
import styles from "../components/public-pages.module.css";
import scrollStyles from "../components/scroll-effects.module.css";

export const metadata: Metadata = { title: "Solicitar cotización | Sigilia", description: "Solicita una cotización empresarial para tu flotilla." };

type QuoteSearchParams = Promise<{ plan?: string | string[] }>;

async function QuoteFormWithPlan({ searchParams }: { searchParams: QuoteSearchParams }) {
  const params = await searchParams;
  const selectedPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  return <QuoteForm selectedPlan={selectedPlan} />;
}

export default function CotizarPage({ searchParams }: { searchParams: QuoteSearchParams }) {
  return <main className={`${styles.page} ${scrollStyles.publicPage}`}>
    <PublicHeader />
    <section className={styles.hero}><span className={styles.kicker}>Solicitud empresarial</span><h1>Cuéntanos cómo opera tu <span>flotilla.</span></h1><p>Usa este formulario para solicitar una cotización o una demostración. Un especialista revisará la información y se pondrá en contacto contigo en menos de 24 horas hábiles.</p><Suspense fallback={<div className={styles.formCard}>Cargando formulario…</div>}><QuoteFormWithPlan searchParams={searchParams} /></Suspense></section>
    <PublicFooter />
  </main>;
}
