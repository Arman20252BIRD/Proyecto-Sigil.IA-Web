"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { captureFacePhoto } from "../login/face-recognition";
import styles from "./page.module.css";
import { Preferences } from "../preferences";

type Status = "Activo" | "Inactivo";
type Vehicle = {
  backendId: string;
  vehicleId: string | null;
  id: string;
  driver: string;
  email: string;
  phone: string;
  device: string;
  status: Status;
  location: string;
  lastSeen: string;
};
type DriverRecord = {
  id: number | string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  estatus_operativo: string;
  vehicle_id: number | string | null | undefined;
  numero_flota: string | null | undefined;
  hardware_id: string | null | undefined;
};
type EventRecord = {
  id: number | string;
  driver_id: number | string;
  created_at: string;
  conductor_nombre: string;
  numero_flota: string | null;
};
type GpsRecord = {
  vehicle_id: number | string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  numero_flota: string | null;
  placas: string | null;
  conductor_nombre: string | null;
};
type DriverInput = {
  nombre: string;
  email: string;
  telefono: string;
  estatus_operativo: string;
};
type AdminProfile = {
  id: number | string;
  nombre: string;
  email: string;
  telefono_corporativo: string | null;
  empresa: string | null;
  profile_photo: string | null;
  mfa_facial_status: boolean;
  totp_enabled: boolean;
  updated_at: string;
};
type AdminProfileInput = Pick<AdminProfile, "nombre" | "email" | "telefono_corporativo" | "empresa"> & { newPassword?: string; confirmPassword?: string; profilePhoto?: string | null };
type Modal = "driver" | "delete" | null;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchWithAuth(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = window.sessionStorage.getItem("sigil_access_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    window.sessionStorage.removeItem("sigil_access_token");
    window.dispatchEvent(new Event("sigil-session-expired"));
  }
  return response;
}

function isDriverRecord(value: unknown): value is DriverRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return ((typeof record.id === "number" && Number.isSafeInteger(record.id))
      || (typeof record.id === "string" && /^\d+$/.test(record.id)))
    && typeof record.nombre === "string"
    && (record.email === null || typeof record.email === "string")
    && (record.telefono === null || typeof record.telefono === "string")
    && typeof record.estatus_operativo === "string"
    && (record.vehicle_id == null || typeof record.vehicle_id === "number" || typeof record.vehicle_id === "string")
    && (record.numero_flota == null || typeof record.numero_flota === "string")
    && (record.hardware_id == null || typeof record.hardware_id === "string");
}

function isEventRecord(value: unknown): value is EventRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (typeof record.id === "number" || typeof record.id === "string")
    && (typeof record.driver_id === "number" || typeof record.driver_id === "string")
    && typeof record.created_at === "string"
    && typeof record.conductor_nombre === "string"
    && (record.numero_flota == null || typeof record.numero_flota === "string");
}

function isGpsRecord(value: unknown): value is GpsRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (typeof record.vehicle_id === "number" || typeof record.vehicle_id === "string")
    && typeof record.timestamp === "string"
    && (record.latitude === null || typeof record.latitude === "number")
    && (record.longitude === null || typeof record.longitude === "number")
    && (record.numero_flota == null || typeof record.numero_flota === "string")
    && (record.placas == null || typeof record.placas === "string")
    && (record.conductor_nombre == null || typeof record.conductor_nombre === "string");
}

function isApiError(value: unknown): value is { error: string } {
  return typeof value === "object"
    && value !== null
    && "error" in value
    && typeof value.error === "string";
}

function mapDriver(record: DriverRecord): Vehicle {
  const status = record.estatus_operativo.toLowerCase();
  return {
    backendId: String(record.id),
    vehicleId: record.vehicle_id == null ? null : String(record.vehicle_id),
    id: record.numero_flota || `CON-${record.id}`,
    driver: record.nombre,
    email: record.email ?? "",
    phone: record.telefono ?? "",
    device: record.hardware_id ?? "Sin asignar",
    status: status === "activo" ? "Activo" : "Inactivo",
    location: "Sin ubicación",
    lastSeen: "Activo",
  };
}

async function fetchDrivers(): Promise<Vehicle[]> {
  const response = await fetchWithAuth(`${API_URL}/api/drivers`);
  const records: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`La API respondió HTTP ${response.status}.`);
  }
  if (!Array.isArray(records) || !records.every(isDriverRecord)) {
    throw new Error("La API devolvió un formato de conductores no válido.");
  }
  return records.map(mapDriver);
}

async function fetchApiRecords<T>(path: string, isRecord: (value: unknown) => value is T): Promise<T[]> {
  const response = await fetchWithAuth(`${API_URL}${path}`);
  const records: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`La API respondió HTTP ${response.status}.`);
  }
  if (!Array.isArray(records) || !records.every(isRecord)) {
    throw new Error(`La API devolvió datos no válidos para ${path}.`);
  }
  return records;
}

function isAdminProfile(value: unknown): value is AdminProfile {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (typeof record.id === "number" || typeof record.id === "string")
    && typeof record.nombre === "string"
    && typeof record.email === "string"
    && (record.telefono_corporativo === null || typeof record.telefono_corporativo === "string")
    && (record.empresa === null || typeof record.empresa === "string")
    && (record.profile_photo === null || typeof record.profile_photo === "string")
    && typeof record.mfa_facial_status === "boolean"
    && typeof record.totp_enabled === "boolean"
    && typeof record.updated_at === "string";
}

async function fetchAdminProfile(): Promise<AdminProfile> {
  const response = await fetchWithAuth(`${API_URL}/api/admin`);
  const result: unknown = await response.json();
  if (!response.ok) {
    throw new Error(isApiError(result) ? result.error : `La API respondió HTTP ${response.status}.`);
  }
  if (!isAdminProfile(result)) {
    throw new Error("La API devolvió un perfil de administrador no válido.");
  }
  return result;
}

export default function DashboardClient() {
  const router = useRouter();
  const [section, setSection] = useState("overview");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [gpsRecords, setGpsRecords] = useState<GpsRecord[]>([]);
  const [driverTab, setDriverTab] = useState("resumen");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [toast, setToast] = useState("");
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [adminDraft, setAdminDraft] = useState<AdminProfileInput>({
    nombre: "",
    email: "",
    telefono_corporativo: "",
    empresa: "",
  });
  const [isLoadingAdminProfile, setIsLoadingAdminProfile] = useState(true);
  const [isSavingAdminProfile, setIsSavingAdminProfile] = useState(false);

  const activeCount = useMemo(() => vehicles.filter((vehicle) => vehicle.status === "Activo").length, [vehicles]);
  const vehiclesWithGps = useMemo(() => vehicles.map((vehicle) => {
    const position = gpsRecords.find((record) => String(record.vehicle_id) === vehicle.vehicleId);
    const location = position
      ? position.latitude !== null && position.longitude !== null
        ? `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`
        : "GPS sin coordenadas"
      : "Sin ubicación";
    return {
      ...vehicle,
      location,
      lastSeen: position ? new Date(position.timestamp).toLocaleString("es-MX") : "Sin datos",
    };
  }), [vehicles, gpsRecords]);
  const filtered = vehiclesWithGps.filter((vehicle) => `${vehicle.id} ${vehicle.driver}`.toLowerCase().includes(search.toLowerCase()));
  const selectedWithGps = selected
    ? vehiclesWithGps.find((vehicle) => vehicle.backendId === selected.backendId) ?? selected
    : null;
  const selectedGps = selected?.vehicleId
    ? gpsRecords.find((record) => String(record.vehicle_id) === selected.vehicleId) ?? null
    : null;
  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }, []);
  const loadAdminProfile = useCallback(async () => {
    setIsLoadingAdminProfile(true);
    try {
      const profile = await fetchAdminProfile();
      setAdminProfile(profile);
      setAdminDraft({
        nombre: profile.nombre,
        email: profile.email,
        telefono_corporativo: profile.telefono_corporativo ?? "",
        empresa: profile.empresa ?? "",
        profilePhoto: profile.profile_photo,
      });
    } catch (error) {
      showToast(`No se pudo cargar la cuenta: ${error instanceof Error ? error.message : "error desconocido"}`);
    } finally {
      setIsLoadingAdminProfile(false);
    }
  }, [showToast]);
  const loadDrivers = useCallback(async () => {
    setIsLoadingDrivers(true);
    try {
      const loaded = await fetchDrivers();
      setVehicles(loaded);
      setSelected((current) => loaded.find((vehicle) => vehicle.backendId === current?.backendId) ?? loaded[0] ?? null);
      setLastUpdated("justo ahora");
    } catch (error) {
      showToast(`No se pudieron cargar los conductores: ${error instanceof Error ? error.message : "error desconocido"}`);
    } finally {
      setIsLoadingDrivers(false);
    }
  }, [showToast]);
  const refreshDashboard = useCallback(async () => {
    await Promise.all([loadDrivers(), loadAdminProfile()]);
    const [eventsResult, gpsResult] = await Promise.allSettled([
      fetchApiRecords("/api/dashboard/events", isEventRecord),
      fetchApiRecords("/api/dashboard/gps", isGpsRecord),
    ]);
    if (eventsResult.status === "fulfilled") {
      setEvents(eventsResult.value);
    } else {
      showToast(`No se pudieron cargar los eventos: ${eventsResult.reason instanceof Error ? eventsResult.reason.message : "error desconocido"}`);
    }
    if (gpsResult.status === "fulfilled") {
      setGpsRecords(gpsResult.value);
    } else {
      showToast(`No se pudieron cargar las posiciones GPS: ${gpsResult.reason instanceof Error ? gpsResult.reason.message : "error desconocido"}`);
    }
  }, [loadAdminProfile, loadDrivers, showToast]);
  useEffect(() => {
    const handleSessionExpired = () => router.replace("/login");
    window.addEventListener("sigil-session-expired", handleSessionExpired);
    return () => window.removeEventListener("sigil-session-expired", handleSessionExpired);
  }, [router]);
  useEffect(() => {
    let active = true;
    fetchAdminProfile().then((profile) => {
      if (!active) return;
      setAdminProfile(profile);
      setAdminDraft({
        nombre: profile.nombre,
        email: profile.email,
        telefono_corporativo: profile.telefono_corporativo ?? "",
        empresa: profile.empresa ?? "",
        profilePhoto: profile.profile_photo,
      });
    }).catch((error: unknown) => {
      if (active) {
        showToast(`No se pudo cargar la cuenta: ${error instanceof Error ? error.message : "error desconocido"}`);
      }
    }).finally(() => {
      if (active) setIsLoadingAdminProfile(false);
    });
    return () => {
      active = false;
    };
  }, [showToast]);
  useEffect(() => {
    let active = true;
    fetchDrivers().then((loaded) => {
      if (!active) return;
      setVehicles(loaded);
      setSelected(loaded[0] ?? null);
      setLastUpdated("justo ahora");
    }).catch((error: unknown) => {
      if (active) {
        showToast(`No se pudieron cargar los conductores: ${error instanceof Error ? error.message : "error desconocido"}`);
      }
    }).finally(() => {
      if (active) setIsLoadingDrivers(false);
    });
    return () => {
      active = false;
    };
  }, [showToast]);
  useEffect(() => {
    let active = true;
    fetchApiRecords("/api/dashboard/events", isEventRecord).then((records) => {
      if (active) setEvents(records);
    }).catch((error: unknown) => {
      if (active) showToast(`No se pudieron cargar los eventos: ${error instanceof Error ? error.message : "error desconocido"}`);
    });
    fetchApiRecords("/api/dashboard/gps", isGpsRecord).then((records) => {
      if (active) setGpsRecords(records);
    }).catch((error: unknown) => {
      if (active) showToast(`No se pudieron cargar las posiciones GPS: ${error instanceof Error ? error.message : "error desconocido"}`);
    });
    return () => {
      active = false;
    };
  }, [showToast]);
  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchApiRecords("/api/dashboard/events", isEventRecord)
        .then((records) => setEvents(records))
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);
  const go = (target: string) => {
    setSection(target);
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
  };
  const selectDriver = (vehicle: Vehicle) => {
    setSelected(vehicle);
    setDriverTab("resumen");
    setSection("fleet");
    window.setTimeout(() => document.getElementById(`driver-detail-${vehicle.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const saveDriver = async (input: DriverInput): Promise<boolean> => {
    setIsSavingDriver(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/api/drivers${editing ? `/${editing.backendId}` : ""}`, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const record: unknown = await response.json();
      if (!response.ok) {
        throw new Error(isApiError(record) ? record.error : `La API respondió HTTP ${response.status}.`);
      }
      if (!isDriverRecord(record)) {
        throw new Error("La API devolvió un conductor con formato no válido.");
      }

      const demoAlertCreated = typeof record === "object" && record !== null
        && "demo_alert_created" in record && record.demo_alert_created === true;
      const saved = mapDriver(record);
      setVehicles((current) => editing
        ? current.map((vehicle) => vehicle.backendId === saved.backendId ? saved : vehicle)
        : [...current, saved]);
      setSelected(saved);
      setLastUpdated("justo ahora");
      if (!editing) {
        fetchApiRecords("/api/dashboard/events", isEventRecord).then((records) => setEvents(records)).catch(() => undefined);
      }
      setModal(null);
      showToast(editing
        ? "Conductor actualizado en PostgreSQL."
        : demoAlertCreated
          ? "Conductor guardado y alerta de demostración registrada."
          : "Conductor guardado en PostgreSQL. Sin alerta en esta ocasión.");
      return true;
    } catch (error) {
      showToast(`No se pudo guardar el conductor: ${error instanceof Error ? error.message : "error desconocido"}`);
      return false;
    } finally {
      setIsSavingDriver(false);
    }
  };
  const saveAdminProfile = async (input: AdminProfileInput): Promise<boolean> => {
    setIsSavingAdminProfile(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/api/admin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(isApiError(result) ? result.error : `La API respondió HTTP ${response.status}.`);
      }
      if (typeof result !== "object" || result === null || !("admin" in result) || !isAdminProfile(result.admin)) {
        throw new Error("La API devolvió un perfil actualizado no válido.");
      }
      setAdminProfile(result.admin);
      setAdminDraft({
        nombre: result.admin.nombre,
        email: result.admin.email,
        telefono_corporativo: result.admin.telefono_corporativo ?? "",
        empresa: result.admin.empresa ?? "",
      });
      showToast("Datos de la cuenta actualizados.");
      return true;
    } catch (error) {
      showToast(`No se pudo guardar la cuenta: ${error instanceof Error ? error.message : "error desconocido"}`);
      return false;
    } finally {
      setIsSavingAdminProfile(false);
    }
  };
  const deleteDriver = async () => {
    if (!selected) return;
    try {
      const response = await fetchWithAuth(`${API_URL}/api/drivers/${selected.backendId}`, { method: "DELETE" });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(isApiError(result) ? result.error : `La API respondió HTTP ${response.status}.`);
      }

      const remaining = vehicles.filter((vehicle) => vehicle.backendId !== selected.backendId);
      setVehicles(remaining);
      setSelected(remaining[0] ?? null);
      setModal(null);
      setLastUpdated("justo ahora");
      showToast("Conductor eliminado de PostgreSQL.");
    } catch (error) {
      showToast(`No se pudo eliminar el conductor: ${error instanceof Error ? error.message : "error desconocido"}`);
    }
  };

  return (
    <main className={styles.shell} data-theme-surface>
      <aside className={styles.sidebar}>
        <div className={`${styles.logo} logo`} aria-label="Sigil.IA">
          <Image src="/logo-sigil-transparente.png" alt="Sigil.IA" width={176} height={117} priority />
        </div>
        <nav className={styles.sidebarNav} aria-label="Módulos principales">
          <SideButton active={section === "overview"} onClick={() => go("overview")} icon="▦">Resumen</SideButton>
          <SideButton active={section === "fleet"} onClick={() => go("fleet")} icon="⌁" badge={String(vehicles.length)}>Conductores ESP32</SideButton>
          <SideButton active={section === "admin"} onClick={() => go("admin")} icon="◎">Configuración admin</SideButton>
          <SideButton active={section === "support"} onClick={() => go("support")} icon="?">Soporte técnico</SideButton>
        </nav>
        <div className={styles.sidebarBottom}>
          <Link href="/login" onClick={() => window.sessionStorage.removeItem("sigil_access_token")}>Cerrar sesión</Link>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <div><span className={styles.breadcrumb}>PANEL DE ADMINISTRACIÓN / {section === "fleet" ? "CONDUCTORES" : section === "admin" ? "CONFIGURACIÓN" : section === "support" ? "SOPORTE" : "RESUMEN"}</span><h1>{section === "fleet" ? "Gestión de conductores" : section === "admin" ? "Configuración de cuenta" : section === "support" ? "Soporte técnico" : "Supervisión telemática activa"}</h1></div>
          <div className={styles.topActions}><Preferences inHeader /><div className={`${styles.userBadge} userBadge`}>{adminProfile?.profile_photo ? <img src={adminProfile.profile_photo} alt="Foto del administrador" /> : <span>{adminProfile?.nombre.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() ?? "—"}</span>}<div><strong>{adminProfile?.nombre ?? (isLoadingAdminProfile ? "Cargando cuenta…" : "Administrador")}</strong><small>{adminProfile?.empresa ?? "Administración"}</small></div></div></div>
        </header>

        <div className={styles.dashboard} id="overview">
          {section === "overview" && <SummaryPanel activeCount={activeCount} vehicleCount={vehicles.length} events={events} gpsCount={gpsRecords.length} onFleet={() => go("fleet")} />}
          {section === "fleet" && <><FleetPanel vehicles={filtered} search={search} selectedId={selected?.id ?? ""} isLoading={isLoadingDrivers} onSearch={setSearch} onAdd={() => { setEditing(null); setModal("driver"); }} onSelect={selectDriver} onEdit={(vehicle) => { setEditing(vehicle); setModal("driver"); }} onDelete={(vehicle) => { setSelected(vehicle); setModal("delete"); }} />{selectedWithGps && <DriverWorkspace vehicle={selectedWithGps} gps={selectedGps} events={events.filter((event) => String(event.driver_id) === selectedWithGps.backendId)} tab={driverTab} setTab={setDriverTab} onToast={showToast} />}</>}
          {section === "admin" && <AdminSettings profile={adminProfile} draft={adminDraft} onDraftChange={setAdminDraft} isLoading={isLoadingAdminProfile} isSaving={isSavingAdminProfile} onSave={saveAdminProfile} />}
          {section === "support" && <SupportPanel onToast={showToast} />}
        </div>
      </section>

      {modal === "driver" && <DriverModal editing={editing} isSaving={isSavingDriver} onClose={() => setModal(null)} onSave={saveDriver} />}
      {modal === "delete" && selected && <Modal title="¿Eliminar conductor?" onClose={() => setModal(null)}><p className={styles.modalCopy}>Se eliminará de la base de datos a <strong>{selected.driver}</strong> ({selected.id}) y sus eventos asociados.</p><div className={styles.modalActions}><button onClick={() => setModal(null)}>Cancelar</button><button className={styles.dangerButton} onClick={() => { void deleteDriver(); }}>Confirmar eliminación</button></div></Modal>}
      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}

function SideButton({ active, onClick, icon, badge, children }: { active: boolean; onClick: () => void; icon: string; badge?: string; children: ReactNode }) {
  const label = children === "Conductores ESP32" ? "Conductores" : children === "Configuración admin" ? "Configuración" : children;
  return <button className={active ? styles.navActive : ""} onClick={onClick}><span>{icon}</span>{label}{badge && <b>{badge}</b>}</button>;
}
function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) { return <article className={`${styles.metric} ${styles[`metric${tone}`]}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }

function SummaryPanel({ activeCount, vehicleCount, events, gpsCount, onFleet }: { activeCount: number; vehicleCount: number; events: EventRecord[]; gpsCount: number; onFleet: () => void }) {
  const [today, setToday] = useState<Date | null>(null);
  const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  useEffect(() => {
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    setToday(current);
  }, []);
  const dayBuckets = today ? Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    const daysFromMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    date.setDate(today.getDate() - daysFromMonday + index);
    const count = events.filter((event) => {
      const eventDate = new Date(event.created_at);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === date.getTime();
    }).length;
    const isToday = date.getTime() === today.getTime();
    return { key: date.toISOString(), label: `${weekDays[index]}${isToday ? " · Hoy" : ""}`, count, isToday };
  }) : Array.from({ length: 7 }, (_, index) => ({ key: `empty-${index}`, label: "—", count: 0 }));
  const maxDailyEvents = Math.max(1, ...dayBuckets.map((day) => day.count));
  return <>
    <div className={styles.metrics}><Metric label="Unidades activas" value={String(activeCount).padStart(2, "0")} detail={`de ${vehicleCount} registradas`} tone="blue" /><Metric label="Eventos registrados" value={String(events.length).padStart(2, "0")} detail="actualizado desde la API" tone="cyan" /><Metric label="Unidades con GPS" value={String(activeCount).padStart(2, "0")} detail="última posición disponible" tone="green" /><Metric label="Conductores registrados" value={String(vehicleCount).padStart(2, "0")} detail="base de datos" tone="orange" /></div>
    <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>01 / ACTIVIDAD</span><h2>Actividad de eventos</h2><p>Las barras cambian con las alertas recibidas cada día.</p></div><span className={styles.liveTag}>● API activa</span></div><div className={`${styles.chartBars} chartBarsReference`}>{dayBuckets.map((day) => <div className={`${styles.chartColumn} chartColumnReference`} key={day.key}><span className="chartBarReference" style={{ height: `${day.count ? Math.max(8, day.count / maxDailyEvents * 100) : 0}%` }} /><small>{day.label}</small><em>{day.count}</em></div>)}</div></section>
    <section className={`${styles.panel} ${styles.summaryHistory}`}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>02 / REGISTRO HISTÓRICO</span><h2>Eventos recientes</h2><p>Se actualiza automáticamente con cada alerta recibida.</p></div><button className={styles.linkButton} onClick={onFleet}>Ver conductores →</button></div><div className={styles.historyTable}>{events.length ? events.slice(0, 8).map((event) => <div className={styles.historyRow} key={String(event.id)}><span className={styles.resolvedDot} /><div><strong>{event.conductor_nombre}</strong><small>Evento #{event.id} · {event.numero_flota ?? `Conductor ${event.driver_id}`} · {new Date(event.created_at).toLocaleString("es-MX")}</small></div><b>Registrado</b></div>) : <p>No hay eventos registrados.</p>}</div></section>
  </>;
}

function LegacySummaryPanel({ activeCount, vehicleCount, events, gpsCount, onFleet }: { activeCount: number; vehicleCount: number; events: EventRecord[]; gpsCount: number; onFleet: () => void }) {
  const history = [
    { label: "Conductores activos", value: activeCount, tone: "chartGreen" },
    { label: "Eventos registrados", value: events.length, tone: "chartBlue" },
    { label: "Unidades con GPS", value: gpsCount, tone: "chartRed" },
  ];
  const eventTimestamps = events.map((event) => Date.parse(event.created_at)).filter(Number.isFinite);
  const latestEventDate = eventTimestamps.length ? new Date(Math.max(...eventTimestamps)) : null;
  const dayLabels = ["L", "M", "X", "J", "V", "S", "D"];
  const dayBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = latestEventDate ? new Date(latestEventDate.getTime()) : null;
    if (date) {
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - 6 + index);
    }
    return {
      key: date?.toISOString() ?? `empty-${index}`,
      label: date ? date.toLocaleDateString("es-MX", { weekday: "short" }).slice(0, 1).toUpperCase() : dayLabels[index],
      count: date ? events.filter((event) => {
        const eventDate = new Date(event.created_at);
        return eventDate.toDateString() === date.toDateString();
      }).length : 0,
    };
  });
  const maxDailyEvents = Math.max(1, ...dayBuckets.map((day) => day.count));
  return <>
    <div className={styles.metrics}><Metric label="Unidades activas" value={String(activeCount).padStart(2, "0")} detail={`de ${vehicleCount} registradas`} tone="blue" /><Metric label="Eventos registrados" value={String(events.length).padStart(2, "0")} detail="consulta PostgreSQL" tone="cyan" /><Metric label="Unidades con GPS" value={String(activeCount).padStart(2, "0")} detail="última posición disponible" tone="green" /><Metric label="Conductores registrados" value={String(vehicleCount).padStart(2, "0")} detail="base de datos" tone="orange" /></div>
    <div className={styles.summaryGrid}>
      <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>01 / TENDENCIA OPERATIVA</span><h2>Actividad de eventos</h2><p>Actividad en los siete días alrededor del registro más reciente.</p></div><span className={styles.liveTag}>● PostgreSQL</span></div><div className={styles.chartBars}>{dayBuckets.map((day) => <div className={styles.chartColumn} key={day.key}><span style={{ height: `${day.count ? Math.max(8, day.count / maxDailyEvents * 100) : 0}%` }} /><small>{day.label}</small></div>)}</div></section>
      <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>02 / ESTADO HISTÓRICO</span><h2>Resumen de eventos</h2></div></div><div className={styles.historyList}>{history.map((item) => <div className={styles.historyItem} key={item.label}><span className={`${styles.historyDot} ${styles[item.tone]}`} /><div><strong>{item.value}</strong><small>{item.label}</small></div></div>)}</div></section>
    </div>
    <section className={`${styles.panel} ${styles.summaryHistory}`}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>03 / REGISTRO HISTÓRICO</span><h2>Eventos recientes</h2><p>Registros obtenidos desde PostgreSQL.</p></div><button className={styles.linkButton} onClick={onFleet}>Ver conductores →</button></div><div className={styles.historyTable}>{events.length ? events.slice(0, 5).map((event) => <div className={styles.historyRow} key={String(event.id)}><span className={styles.resolvedDot} /><div><strong>{event.conductor_nombre}</strong><small>Evento #{event.id} · {event.numero_flota ?? `Conductor ${event.driver_id}`} · {new Date(event.created_at).toLocaleString("es-MX")}</small></div><b>Registrado</b></div>) : <p>No hay eventos registrados.</p>}</div></section>
  </>;
}

function SupportPanel({ onToast: _onToast }: { onToast: (message: string) => void }) {
  const [supportOpen, setSupportOpen] = useState(false);
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "soporte@sigil.ia";
  return <>
    <section className={styles.supportPanel}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>01 / CENTRO DE AYUDA</span><h2>Soporte técnico de Sigil.IA</h2><p>Obtén ayuda para la plataforma, los dispositivos ESP32 y la operación de tu flota.</p></div><span className={styles.supportStatus}>● Soporte disponible</span></div><div className={styles.supportGrid}>
      <article className={styles.supportCard}><span>?</span><h3>Guía de operación</h3><p>Consulta cómo administrar conductores, alertas, GPS y registros históricos.</p><a className="supportAction" href="/manual-sigilia.pdf" download="manual-sigilia.pdf">Descargar manual PDF →</a></article>
      <article className={styles.supportCard}><span>☎</span><h3>Contacto de soporte</h3><p>Canal para solicitar asistencia con la instalación o los sensores.</p><button onClick={() => setSupportOpen(true)}>Contactar soporte →</button></article>
    </div></section>
    {supportOpen && <Modal title="Contactar soporte" onClose={() => setSupportOpen(false)}><div className={styles.callDialog}><span className={styles.contactAvatar}>?</span><h3>Soporte técnico de Sigil.IA</h3><p>{supportEmail}</p><small>Se abrirá tu aplicación de correo para solicitar asistencia.</small><a className={styles.primaryButton} href={`mailto:${supportEmail}?subject=Solicitud%20de%20soporte`}>Enviar correo</a></div></Modal>}
  </>;
}

function FleetPanel({ vehicles, search, selectedId, isLoading, onSearch, onAdd, onSelect, onEdit, onDelete }: { vehicles: Vehicle[]; search: string; selectedId: string; isLoading: boolean; onSearch: (value: string) => void; onAdd: () => void; onSelect: (vehicle: Vehicle) => void; onEdit: (vehicle: Vehicle) => void; onDelete: (vehicle: Vehicle) => void }) {
  return <section className={styles.panel} id="fleet">
    <div className={styles.panelHeader}><div><span className={styles.sectionLabel}>01 / CONDUCTORES</span><h2>Gestionar conductor</h2><p>Busca por ID o nombre y selecciona un conductor para desplegar su detalle.</p></div><button className={styles.primaryButton} onClick={onAdd}>+ Alta de conductor</button></div>
    <div className={styles.fleetToolbar}><label>⌕ <input className={styles.searchBox} value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por ID o nombre..." /></label><span>{vehicles.length} resultados</span></div>
    <div className={styles.tableWrap}><table><thead><tr><th>Unidad / conductor</th><th>Teléfono</th><th>Correo electrónico</th><th>Estado</th><th>Última ubicación</th><th>Acciones</th></tr></thead><tbody>
      {vehicles.length ? vehicles.map((vehicle) => <tr key={vehicle.backendId} className={`${styles.driverRow} ${selectedId === vehicle.id ? styles.driverRowSelected : ""}`}>
        <td><button type="button" className={styles.driverSelect} onClick={() => onSelect(vehicle)}><strong>{vehicle.id}</strong><span>{vehicle.driver}</span></button></td>
        <td>{vehicle.phone || "Sin teléfono registrado"}</td>
        <td>{vehicle.email || "Sin correo registrado"}</td>
        <td><span className={`${styles.status} ${vehicle.status === "Activo" ? styles.statusActive : styles.statusOffline}`}><i />{vehicle.status}</span></td>
        <td>{vehicle.location}</td>
        <td><div className={styles.rowActions}><button onClick={() => onSelect(vehicle)}>Ver</button><button onClick={() => onEdit(vehicle)}>Editar</button><button className={styles.dangerAction} onClick={() => onDelete(vehicle)}>Eliminar</button></div></td>
      </tr>) : <tr><td colSpan={6}>{isLoading ? "Cargando conductores…" : search.trim() ? "No hay conductores que coincidan con la búsqueda." : "No hay conductores registrados en PostgreSQL."}</td></tr>}
    </tbody></table></div>
  </section>;
}

function DriverWorkspace({ vehicle, gps, events, tab, setTab, onToast }: { vehicle: Vehicle; gps: GpsRecord | null; events: EventRecord[]; tab: string; setTab: (tab: string) => void; onToast: (message: string) => void }) {
  const [contactOpen, setContactOpen] = useState(false);
  const coordinates = gps && gps.latitude !== null && gps.longitude !== null
    ? `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`
    : "Sin datos";
  const latestEvent = events[0];
  return <section className={styles.driverWorkspace} id={`driver-detail-${vehicle.id}`}>
    <div className={styles.driverHeader}><div><span className={styles.sectionLabel}>02 / CONDUCTOR SELECCIONADO</span><h2>{vehicle.driver} <small>{vehicle.id}</small></h2><p>{vehicle.phone || "Sin teléfono registrado"} · {vehicle.location}</p></div><span className={`${styles.status} ${vehicle.status === "Activo" ? styles.statusActive : styles.statusOffline}`}><i />{vehicle.status}</span></div>
    <nav className={styles.detailTabs} aria-label="Detalle del conductor">{[["resumen", "Resumen"], ["events", "Eventos"], ["gps", "GPS"], ["contact", "Contactar"], ["logs", "Logs y registros"]].map(([id, label]) => <button key={id} className={tab === id ? styles.detailTabActive : styles.detailTab} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {tab === "resumen" && <div className={styles.detailGrid}><DetailCard title="Estado" value={vehicle.status} detail="Estado operativo del conductor" /><DetailCard title="Último evento" value={latestEvent ? `Evento #${latestEvent.id}` : "Sin eventos"} detail={latestEvent ? new Date(latestEvent.created_at).toLocaleString("es-MX") : "Sin actividad registrada"} /><DetailCard title="Última posición GPS" value={coordinates} detail={gps ? new Date(gps.timestamp).toLocaleString("es-MX") : "Sin datos GPS asociados"} /></div>}
    {tab === "events" && <EventTable events={events} />}
    {tab === "gps" && <div className={styles.driverMap}><div className={styles.mapGrid} /><div className={styles.driverPin}>● {vehicle.id}</div><p>{gps ? `Última posición recibida: ${coordinates} · ${new Date(gps.timestamp).toLocaleString("es-MX")}` : "No hay posiciones GPS registradas para este vehículo."}</p></div>}
    {tab === "contact" && <div className={styles.contactModule}><div className={styles.contactInfo}><span className={styles.contactAvatar}>{vehicle.driver.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span><div><h3>Contactar al conductor</h3><p>{vehicle.driver} · {vehicle.phone || "Sin teléfono registrado."}</p></div></div><button className={styles.primaryButton} disabled={!vehicle.phone} onClick={() => setContactOpen(true)}>Contactar conductor</button></div>}
    {contactOpen && vehicle.phone && <Modal title="Contactar al conductor" onClose={() => setContactOpen(false)}><div className={styles.callDialog}><span className={styles.contactAvatar}>{vehicle.driver.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span><h3>{vehicle.driver}</h3><p>{vehicle.phone}</p><small>Se abrirá la aplicación de llamadas disponible en este equipo.</small><a className={styles.primaryButton} href={`tel:${vehicle.phone}`}>Llamar ahora</a></div></Modal>}
    {tab === "logs" && <EventTable events={events} />}
  </section>;
}

function DetailCard({ title, value, detail }: { title: string; value: string; detail: string }) { return <article className={styles.detailCard}><span>{title}</span><strong>{value}</strong><small>{detail}</small></article>; }
function EventTable({ events }: { events: EventRecord[] }) { return <div className={styles.eventList}>{events.length ? events.map((event) => <div className={styles.eventRow} key={String(event.id)}><i className={styles.resolvedDot} /><div><strong>Evento #{event.id}</strong><span>{new Date(event.created_at).toLocaleString("es-MX")} · {event.numero_flota ?? `Conductor ${event.driver_id}`}</span></div><code>{event.conductor_nombre}</code></div>) : <p>No hay eventos registrados para este conductor.</p>}</div>; }
function AdminSettings({
  profile,
  draft,
  onDraftChange,
  isLoading,
  isSaving,
  onSave,
}: {
  profile: AdminProfile | null;
  draft: AdminProfileInput;
  onDraftChange: (draft: AdminProfileInput) => void;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (input: AdminProfileInput) => Promise<boolean>;
}) {
  const photoVideoRef = useRef<HTMLVideoElement>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const [photoCameraOpen, setPhotoCameraOpen] = useState(false);
  const [photoStatus, setPhotoStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => () => {
    photoStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const startPhotoCamera = async () => {
    try {
      photoStreamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      photoStreamRef.current = stream;
      setPhotoCameraOpen(true);
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (!photoVideoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        photoStreamRef.current = null;
        setPhotoCameraOpen(false);
        return;
      }
      photoVideoRef.current.srcObject = stream;
      await photoVideoRef.current.play();
      setPhotoStatus("Mira al frente y mantén el rostro centrado.");
    } catch {
      setPhotoStatus("No se pudo abrir la cámara.");
    }
  };

  const capturePhotoWithFace = async () => {
    if (!photoVideoRef.current) return;
    setPhotoStatus("Validando rostro…");
    try {
      const photo = await captureFacePhoto(photoVideoRef.current, setPhotoStatus);
      updateField("profilePhoto", photo);
      const saved = await onSave({ ...draft, profilePhoto: photo });
      setPhotoStatus(saved ? "Foto facial guardada en el perfil." : "No se pudo guardar la foto en el perfil.");
    } catch (error) {
      setPhotoStatus(error instanceof Error ? error.message : "No se pudo validar el rostro.");
    } finally {
      photoStreamRef.current?.getTracks().forEach((track) => track.stop());
      photoStreamRef.current = null;
      setPhotoCameraOpen(false);
    }
  };

  const updateField = (field: keyof AdminProfileInput, value: string) => {
    onDraftChange({ ...draft, [field]: value });
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.newPassword && draft.newPassword !== draft.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }
    setPasswordError("");
    await onSave({
      ...draft,
      nombre: draft.nombre.trim(),
      email: draft.email.trim(),
      telefono_corporativo: draft.telefono_corporativo?.trim() || null,
      empresa: draft.empresa?.trim() || null,
    });
  };
  return (
    <section className={styles.adminSettings} id="admin">
      <div>
        <span className={styles.sectionLabel}>01 / CUENTA DEL ADMINISTRADOR</span>
        <h2>Datos de la cuenta</h2>
        <p>Puedes actualizar tus datos aquí.</p>
      </div>
      {isLoading && <p role="status">Cargando los datos de la cuenta…</p>}
      {!isLoading && !profile && <p role="alert">No fue posible obtener los datos de esta cuenta. Usa «Actualizar» para volver a intentarlo.</p>}
      {profile && (
        <form onSubmit={handleSubmit}>
          <div className={styles.settingsGrid}>
            <label>Nombre completo<input value={draft.nombre} onChange={(event) => updateField("nombre", event.target.value)} maxLength={120} required disabled={isSaving} /></label>
            <label>Correo corporativo<input value={draft.email} type="email" maxLength={254} required readOnly aria-readonly="true" tabIndex={-1} disabled /></label>
            <label>Teléfono<input value={draft.telefono_corporativo ?? ""} onChange={(event) => updateField("telefono_corporativo", event.target.value)} type="tel" maxLength={30} disabled={isSaving} /></label>
            <label>Empresa<input value={draft.empresa ?? ""} onChange={(event) => updateField("empresa", event.target.value)} maxLength={120} disabled={isSaving} /></label>
          </div>
          <div className={`${styles.settingsSecurity} profileSettingsCard`}>
            <strong>Foto y contraseña</strong>
            <div className="profilePhotoEditor">
              {profile.profile_photo ? <img src={profile.profile_photo} alt="Foto del administrador" /> : <span>{profile.nombre.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>}
              <button type="button" className={styles.primaryButton} disabled={isSaving} onClick={photoCameraOpen ? capturePhotoWithFace : startPhotoCamera}>
                {photoCameraOpen ? "Capturar con reconocimiento" : "Tomar foto con reconocimiento"}
              </button>
            </div>
            <div className="profileCamera">
              {photoCameraOpen && <video ref={photoVideoRef} autoPlay muted playsInline />}
              {photoStatus && <small>{photoStatus}</small>}
            </div>
            <label>Nueva contraseña<input type="password" minLength={12} placeholder="Mínimo 12 caracteres" disabled={isSaving} onChange={(event) => updateField("newPassword" as keyof AdminProfileInput, event.target.value)} /></label>
            <label>Validar contraseña<input type="password" minLength={12} placeholder="Mínimo 12 caracteres" disabled={isSaving} onChange={(event) => updateField("confirmPassword" as keyof AdminProfileInput, event.target.value)} /></label>
            {passwordError && <small role="alert">{passwordError}</small>}
          </div>
          <button className={styles.primaryButton} type="submit" disabled={isSaving}>{isSaving ? "Guardando…" : "Guardar configuración"}</button>
        </form>
      )}
    </section>
  );
}
function DriverModal({ editing, isSaving, onClose, onSave }: { editing: Vehicle | null; isSaving: boolean; onClose: () => void; onSave: (driver: DriverInput) => Promise<boolean> }) {
  return <Modal title={editing ? "Editar conductor" : "Alta de nuevo conductor"} onClose={onClose}>
    <form className={styles.modalForm} onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const saved = await onSave({
        nombre: String(data.get("nombre")),
        email: String(data.get("email")),
        telefono: String(data.get("telefono")),
        estatus_operativo: String(data.get("estatus_operativo")),
      });
      if (saved) onClose();
    }}>
      <label>Nombre completo<input name="nombre" defaultValue={editing?.driver} required placeholder="Ej. Ana García" /></label>
      <label>Correo electrónico<input name="email" type="email" defaultValue={editing?.email} placeholder="ana@empresa.com" /></label>
      <label>Teléfono<input name="telefono" type="tel" defaultValue={editing?.phone} placeholder="+52 000 000 0000" /></label>
      <label>Estado operativo<select name="estatus_operativo" defaultValue={editing?.status ?? "Activo"}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></label>
      <div className={styles.modalActions}><button type="button" onClick={onClose} disabled={isSaving}>Cancelar</button><button className={styles.primaryButton} type="submit" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar conductor"}</button></div>
    </form>
  </Modal>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}><div className={styles.modal} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className={styles.modalHeader}><h2>{title}</h2><button onClick={onClose} aria-label="Cerrar">×</button></div>{children}</div></div>; }
