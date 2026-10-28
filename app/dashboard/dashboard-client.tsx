"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import styles from "./page.module.css";

type Status = "Activo" | "Atención" | "Sin conexión";
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
    status: status === "activo" || status === "en ruta"
      ? "Activo"
      : status === "atención" || status === "atencion"
        ? "Atención"
        : "Sin conexión",
    location: "Sin ubicación",
    lastSeen: "Sin datos",
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
    await loadDrivers();
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
  }, [loadDrivers, showToast]);
  useEffect(() => {
    const handleSessionExpired = () => router.replace("/login");
    window.addEventListener("sigil-session-expired", handleSessionExpired);
    return () => window.removeEventListener("sigil-session-expired", handleSessionExpired);
  }, [router]);
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

      const saved = mapDriver(record);
      setVehicles((current) => editing
        ? current.map((vehicle) => vehicle.backendId === saved.backendId ? saved : vehicle)
        : [...current, saved]);
      setSelected(saved);
      setLastUpdated("justo ahora");
      setModal(null);
      showToast(editing ? "Conductor actualizado en PostgreSQL." : "Conductor guardado en PostgreSQL.");
      return true;
    } catch (error) {
      showToast(`No se pudo guardar el conductor: ${error instanceof Error ? error.message : "error desconocido"}`);
      return false;
    } finally {
      setIsSavingDriver(false);
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
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/informativo" className={styles.logo}>
          <Image src="/sigil-logo.png" alt="Sigil.IA" width={176} height={117} priority />
        </Link>
        <div className={styles.workspace}><span className={styles.onlineDot} /> Cluster MX-01 <small>Operativo</small></div>
        <nav className={styles.sidebarNav} aria-label="Módulos principales">
          <SideButton active={section === "overview"} onClick={() => go("overview")} icon="▦">Resumen</SideButton>
          <SideButton active={section === "fleet"} onClick={() => go("fleet")} icon="⌁" badge={String(vehicles.length)}>Conductores ESP32</SideButton>
          <SideButton active={section === "admin"} onClick={() => go("admin")} icon="◎">Configuración admin</SideButton>
          <SideButton active={section === "support"} onClick={() => go("support")} icon="?">Soporte técnico</SideButton>
        </nav>
        <div className={styles.sidebarBottom}>
          <button onClick={() => showToast("El centro de soporte se habilitará con el backend SOC.")}>? &nbsp;Contacto directo</button>
          <Link href="/login" onClick={() => window.sessionStorage.removeItem("sigil_access_token")}>Cerrar sesión</Link>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <div><span className={styles.breadcrumb}>PANEL DE ADMINISTRACIÓN / {section === "fleet" ? "CONDUCTORES" : section === "admin" ? "CONFIGURACIÓN" : section === "support" ? "SOPORTE" : "RESUMEN"}</span><h1>{section === "fleet" ? "Gestión de conductores" : section === "admin" ? "Configuración de cuenta" : section === "support" ? "Soporte técnico" : "Supervisión telemática activa"}</h1></div>
          <div className={styles.topActions}><span className={styles.updated}>Actualizado {lastUpdated}</span><button className={styles.refreshButton} onClick={() => { void refreshDashboard(); }}>↻ Actualizar</button><div className={styles.userBadge}><span>CM</span><div><strong>Administrador</strong><small>Control total</small></div></div></div>
        </header>

        <div className={styles.dashboard} id="overview">
          {section === "overview" && <SummaryPanel activeCount={activeCount} vehicleCount={vehicles.length} events={events} gpsCount={gpsRecords.length} onFleet={() => go("fleet")} />}
          {section === "fleet" && <><FleetPanel vehicles={filtered} search={search} selectedId={selected?.id ?? ""} isLoading={isLoadingDrivers} onSearch={setSearch} onAdd={() => { setEditing(null); setModal("driver"); }} onSelect={selectDriver} onEdit={(vehicle) => { setEditing(vehicle); setModal("driver"); }} onDelete={(vehicle) => { setSelected(vehicle); setModal("delete"); }} />{selectedWithGps && <DriverWorkspace vehicle={selectedWithGps} gps={selectedGps} events={events.filter((event) => String(event.driver_id) === selectedWithGps.backendId)} tab={driverTab} setTab={setDriverTab} onToast={showToast} />}</>}
          {section === "admin" && <AdminSettings onToast={showToast} />}
          {section === "support" && <SupportPanel onToast={showToast} />}
        </div>
      </section>

      {modal === "driver" && <DriverModal editing={editing} isSaving={isSavingDriver} onClose={() => setModal(null)} onSave={saveDriver} />}
      {modal === "delete" && selected && <Modal title="¿Eliminar conductor?" onClose={() => setModal(null)}><p className={styles.modalCopy}>Se eliminará de la base de datos a <strong>{selected.driver}</strong> ({selected.id}) y sus eventos asociados.</p><div className={styles.modalActions}><button onClick={() => setModal(null)}>Cancelar</button><button className={styles.dangerButton} onClick={() => { void deleteDriver(); }}>Confirmar eliminación</button></div></Modal>}
      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}

function SideButton({ active, onClick, icon, badge, children }: { active: boolean; onClick: () => void; icon: string; badge?: string; children: ReactNode }) { return <button className={active ? styles.navActive : ""} onClick={onClick}><span>{icon}</span>{children}{badge && <b>{badge}</b>}</button>; }
function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) { return <article className={`${styles.metric} ${styles[`metric${tone}`]}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }

function SummaryPanel({ activeCount, vehicleCount, events, gpsCount, onFleet }: { activeCount: number; vehicleCount: number; events: EventRecord[]; gpsCount: number; onFleet: () => void }) {
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
    <div className={styles.noticeBar}><span>●</span><p><strong>Datos de la flota.</strong> {activeCount} de {vehicleCount} conductores tienen estado activo en PostgreSQL.</p><button onClick={onFleet}>Gestionar conductores →</button></div>
    <div className={styles.metrics}><Metric label="Unidades activas" value={String(activeCount).padStart(2, "0")} detail={`de ${vehicleCount} registradas`} tone="blue" /><Metric label="Eventos registrados" value={String(events.length).padStart(2, "0")} detail="consulta PostgreSQL" tone="cyan" /><Metric label="Unidades con GPS" value={String(gpsCount).padStart(2, "0")} detail="última posición disponible" tone="green" /><Metric label="Conductores registrados" value={String(vehicleCount).padStart(2, "0")} detail="base de datos" tone="orange" /></div>
    <div className={styles.summaryGrid}>
      <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>01 / TENDENCIA OPERATIVA</span><h2>Actividad de eventos</h2><p>Actividad en los siete días alrededor del registro más reciente.</p></div><span className={styles.liveTag}>● PostgreSQL</span></div><div className={styles.chartBars}>{dayBuckets.map((day) => <div className={styles.chartColumn} key={day.key}><span style={{ height: `${day.count ? Math.max(8, day.count / maxDailyEvents * 100) : 0}%` }} /><small>{day.label}</small></div>)}</div></section>
      <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>02 / ESTADO HISTÓRICO</span><h2>Resumen de eventos</h2></div></div><div className={styles.historyList}>{history.map((item) => <div className={styles.historyItem} key={item.label}><span className={`${styles.historyDot} ${styles[item.tone]}`} /><div><strong>{item.value}</strong><small>{item.label}</small></div></div>)}</div></section>
    </div>
    <section className={`${styles.panel} ${styles.summaryHistory}`}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>03 / REGISTRO HISTÓRICO</span><h2>Eventos recientes</h2><p>Registros obtenidos desde PostgreSQL.</p></div><button className={styles.linkButton} onClick={onFleet}>Ver conductores →</button></div><div className={styles.historyTable}>{events.length ? events.slice(0, 5).map((event) => <div className={styles.historyRow} key={String(event.id)}><span className={styles.resolvedDot} /><div><strong>{event.conductor_nombre}</strong><small>Evento #{event.id} · {event.numero_flota ?? `Conductor ${event.driver_id}`} · {new Date(event.created_at).toLocaleString("es-MX")}</small></div><b>Registrado</b></div>) : <p>No hay eventos registrados.</p>}</div></section>
  </>;
}

function SupportPanel({ onToast }: { onToast: (message: string) => void }) {
  return <section className={styles.supportPanel}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>01 / CENTRO DE AYUDA</span><h2>Soporte técnico de Sigil.IA</h2><p>Obtén ayuda para la plataforma, los dispositivos ESP32 y la operación de tu flota.</p></div><span className={styles.supportStatus}>● Soporte disponible</span></div><div className={styles.supportGrid}><article className={styles.supportCard}><span>◉</span><h3>Incidencia técnica</h3><p>Reporta fallas de telemetría, conexión o funcionamiento del dashboard.</p><button onClick={() => onToast("Formulario de incidencia preparado para conectar con soporte.")}>Abrir incidencia →</button></article><article className={styles.supportCard}><span>?</span><h3>Guía de operación</h3><p>Consulta cómo administrar conductores, alertas, GPS y registros históricos.</p><button onClick={() => onToast("La documentación operativa estará disponible en la siguiente versión.")}>Ver documentación →</button></article><article className={styles.supportCard}><span>☎</span><h3>Contacto de soporte</h3><p>Canal para solicitar asistencia con la instalación o los sensores.</p><button onClick={() => onToast("Solicitud de contacto preparada para el equipo técnico.")}>Contactar soporte →</button></article></div><div className={styles.supportNotice}><strong>Antes de solicitar ayuda</strong><span>Ten a la mano el ID del conductor, dispositivo ESP32, hora del evento y captura de la alerta.</span></div></section>;
}

function FleetPanel({ vehicles, search, selectedId, isLoading, onSearch, onAdd, onSelect, onEdit, onDelete }: { vehicles: Vehicle[]; search: string; selectedId: string; isLoading: boolean; onSearch: (value: string) => void; onAdd: () => void; onSelect: (vehicle: Vehicle) => void; onEdit: (vehicle: Vehicle) => void; onDelete: (vehicle: Vehicle) => void }) {
  return <section className={styles.panel} id="fleet">
    <div className={styles.panelHeader}><div><span className={styles.sectionLabel}>01 / CRUD DE CONDUCTORES</span><h2>Conductores y dispositivos ESP32</h2><p>Busca por ID o nombre y selecciona un conductor para desplegar su detalle.</p></div><button className={styles.primaryButton} onClick={onAdd}>+ Alta de conductor</button></div>
    <div className={styles.fleetToolbar}><label>⌕ <input className={styles.searchBox} value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por ID o nombre..." /></label><span>{vehicles.length} resultados</span></div>
    <div className={styles.tableWrap}><table><thead><tr><th>Unidad / conductor</th><th>Dispositivo</th><th>Estado</th><th>Última ubicación</th><th>Señal</th><th>CRUD</th></tr></thead><tbody>
      {vehicles.length ? vehicles.map((vehicle) => <tr key={vehicle.backendId} className={`${styles.driverRow} ${selectedId === vehicle.id ? styles.driverRowSelected : ""}`}>
        <td><button type="button" className={styles.driverSelect} onClick={() => onSelect(vehicle)}><strong>{vehicle.id}</strong><span>{vehicle.driver}</span></button></td>
        <td><code>{vehicle.device}</code></td>
        <td><span className={`${styles.status} ${vehicle.status === "Activo" ? styles.statusActive : vehicle.status === "Atención" ? styles.statusWarning : styles.statusOffline}`}><i />{vehicle.status}</span></td>
        <td>{vehicle.location}</td><td>{vehicle.lastSeen}</td>
        <td><div className={styles.rowActions}><button onClick={() => onSelect(vehicle)}>Ver</button><button onClick={() => onEdit(vehicle)}>Editar</button><button className={styles.dangerAction} onClick={() => onDelete(vehicle)}>Eliminar</button></div></td>
      </tr>) : <tr><td colSpan={6}>{isLoading ? "Cargando conductores…" : search.trim() ? "No hay conductores que coincidan con la búsqueda." : "No hay conductores registrados en PostgreSQL."}</td></tr>}
    </tbody></table></div>
  </section>;
}

function DriverWorkspace({ vehicle, gps, events, tab, setTab, onToast }: { vehicle: Vehicle; gps: GpsRecord | null; events: EventRecord[]; tab: string; setTab: (tab: string) => void; onToast: (message: string) => void }) {
  const coordinates = gps && gps.latitude !== null && gps.longitude !== null
    ? `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`
    : "Sin datos";
  const latestEvent = events[0];
  return <section className={styles.driverWorkspace} id={`driver-detail-${vehicle.id}`}>
    <div className={styles.driverHeader}><div><span className={styles.sectionLabel}>02 / CONDUCTOR SELECCIONADO</span><h2>{vehicle.driver} <small>{vehicle.id}</small></h2><p>{vehicle.device} · {vehicle.location}</p></div><span className={`${styles.status} ${vehicle.status === "Activo" ? styles.statusActive : styles.statusWarning}`}><i />{vehicle.status}</span></div>
    <nav className={styles.detailTabs} aria-label="Detalle del conductor">{[["resumen", "Resumen"], ["events", "Eventos"], ["gps", "GPS"], ["contact", "Contactar"], ["logs", "Logs y registros"]].map(([id, label]) => <button key={id} className={tab === id ? styles.detailTabActive : styles.detailTab} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {tab === "resumen" && <div className={styles.detailGrid}><DetailCard title="Dispositivo ESP32" value={vehicle.device} detail={vehicle.device === "Sin asignar" ? "Sin vehículo asociado" : "Identificador recibido del backend"} /><DetailCard title="Último evento" value={latestEvent ? `Evento #${latestEvent.id}` : "Sin eventos"} detail={latestEvent ? new Date(latestEvent.created_at).toLocaleString("es-MX") : "Sin actividad registrada"} /><DetailCard title="Última posición GPS" value={coordinates} detail={gps ? new Date(gps.timestamp).toLocaleString("es-MX") : "Sin datos GPS asociados"} /></div>}
    {tab === "events" && <EventTable events={events} />}
    {tab === "gps" && <div className={styles.driverMap}><div className={styles.mapGrid} /><div className={styles.driverPin}>● {vehicle.id}</div><p>{gps ? `Última posición recibida: ${coordinates} · ${new Date(gps.timestamp).toLocaleString("es-MX")}` : "No hay posiciones GPS registradas para este vehículo."}</p></div>}
    {tab === "contact" && <div className={styles.contactModule}><div><span className={styles.contactAvatar}>{vehicle.driver.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span><h3>Contactar al conductor</h3><p>{vehicle.driver} · {vehicle.phone || "Sin teléfono registrado."}</p></div><button className={styles.primaryButton} disabled={!vehicle.phone} onClick={() => onToast(`Solicitud de contacto preparada para ${vehicle.driver}.`)}>Solicitar contacto</button></div>}
    {tab === "logs" && <EventTable events={events} />}
  </section>;
}

function DetailCard({ title, value, detail }: { title: string; value: string; detail: string }) { return <article className={styles.detailCard}><span>{title}</span><strong>{value}</strong><small>{detail}</small></article>; }
function EventTable({ events }: { events: EventRecord[] }) { return <div className={styles.eventList}>{events.length ? events.map((event) => <div className={styles.eventRow} key={String(event.id)}><i className={styles.resolvedDot} /><div><strong>Evento #{event.id}</strong><span>{new Date(event.created_at).toLocaleString("es-MX")} · {event.numero_flota ?? `Conductor ${event.driver_id}`}</span></div><code>{event.conductor_nombre}</code></div>) : <p>No hay eventos registrados para este conductor.</p>}</div>; }
function AdminSettings({ onToast }: { onToast: (message: string) => void }) { return <section className={styles.adminSettings} id="admin"><div><span className={styles.sectionLabel}>01 / CUENTA DEL ADMINISTRADOR</span><h2>Configuración separada de la flota</h2><p>Gestiona tus datos, seguridad y preferencias sin mezclarlos con los conductores.</p></div><div className={styles.settingsGrid}><label>Nombre completo<input defaultValue="Carlos Méndez R." /></label><label>Correo corporativo<input defaultValue="admin@sigil.ia" type="email" /></label><label>Teléfono de recuperación<input defaultValue="+52 999 123 4567" type="tel" /></label><label>Zona horaria<input defaultValue="America/Mexico_City" /></label></div><div className={styles.settingsSecurity}><div><strong>Seguridad de cuenta</strong><span>MFA facial activo · última validación hoy</span></div><button className={styles.primaryButton} onClick={() => onToast("Cambios de configuración preparados para guardar.")}>Guardar configuración</button></div></section>; }
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
      <label>Estado operativo<select name="estatus_operativo" defaultValue={editing?.status === "Activo" ? "En ruta" : editing?.status ?? "En ruta"}><option value="En ruta">En ruta</option><option value="Atención">Atención</option><option value="Sin conexión">Sin conexión</option></select></label>
      <div className={styles.modalActions}><button type="button" onClick={onClose} disabled={isSaving}>Cancelar</button><button className={styles.primaryButton} type="submit" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar conductor"}</button></div>
    </form>
  </Modal>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}><div className={styles.modal} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className={styles.modalHeader}><h2>{title}</h2><button onClick={onClose} aria-label="Cerrar">×</button></div>{children}</div></div>; }
