"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import styles from "./page.module.css";

type Status = "Activo" | "Atención" | "Sin conexión";
type Vehicle = {
  id: string;
  driver: string;
  device: string;
  status: Status;
  location: string;
  lastSeen: string;
};
type AlertItem = {
  id: string;
  title: string;
  detail: string;
  state: "En proceso" | "Resuelta";
};
type Modal = "driver" | "delete" | null;

const starterVehicles: Vehicle[] = [
  { id: "SIG-024", driver: "Carlos Méndez R.", device: "ESP32-AX42", status: "Activo", location: "Av. Reforma · CDMX", lastSeen: "Hace 2 min" },
  { id: "SIG-018", driver: "Mariana López G.", device: "ESP32-KM18", status: "Atención", location: "Periférico Sur · CDMX", lastSeen: "Hace 8 min" },
  { id: "SIG-011", driver: "Jorge Ramírez T.", device: "ESP32-QP71", status: "Sin conexión", location: "Última ubicación: Coyoacán", lastSeen: "Hace 31 min" },
];

const initialAlerts: Record<string, AlertItem[]> = {
  "SIG-024": [
    { id: "ALT-204", title: "Cambio de ruta detectado", detail: "Hace 42 min · GPS", state: "En proceso" },
    { id: "ALT-198", title: "Telemetría nominal", detail: "Ayer · Sistema", state: "Resuelta" },
  ],
  "SIG-018": [
    { id: "ALT-207", title: "Vibración anómala", detail: "Hace 8 min · IMU", state: "En proceso" },
    { id: "ALT-191", title: "Carga fuera de rango", detail: "Ayer · LOAD", state: "Resuelta" },
  ],
  "SIG-011": [{ id: "ALT-210", title: "Unidad sin conexión", detail: "Hace 31 min · ESP32", state: "En proceso" }],
};

export default function DashboardClient() {
  const [section, setSection] = useState("overview");
  const [vehicles, setVehicles] = useState(starterVehicles);
  const [selected, setSelected] = useState(starterVehicles[0]);
  const [driverTab, setDriverTab] = useState("resumen");
  const [search, setSearch] = useState("");
  const [alerts, setAlerts] = useState(initialAlerts);
  const [modal, setModal] = useState<Modal>(null);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [toast, setToast] = useState("");
  const [lastUpdated, setLastUpdated] = useState("hace 2 min");

  const activeCount = useMemo(() => vehicles.filter((vehicle) => vehicle.status === "Activo").length, [vehicles]);
  const openAlerts = useMemo(
    () => Object.values(alerts).flat().filter((alert) => alert.state === "En proceso").length,
    [alerts],
  );
  const filtered = vehicles.filter((vehicle) => `${vehicle.id} ${vehicle.driver}`.toLowerCase().includes(search.toLowerCase()));
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };
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
  const updateAlert = (alertId: string) => {
    setAlerts((current) => ({
      ...current,
      [selected.id]: current[selected.id].map((item) =>
        item.id === alertId ? { ...item, state: item.state === "Resuelta" ? "En proceso" : "Resuelta" } : item,
      ),
    }));
  };
  const deleteDriver = () => {
    setVehicles((current) => current.filter((vehicle) => vehicle.id !== selected.id));
    setModal(null);
    showToast(`${selected.id} fue retirado de la vista local.`);
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
          <Link href="/login">Cerrar sesión</Link>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <div><span className={styles.breadcrumb}>PANEL DE ADMINISTRACIÓN / {section === "fleet" ? "CONDUCTORES" : section === "admin" ? "CONFIGURACIÓN" : section === "support" ? "SOPORTE" : "RESUMEN"}</span><h1>{section === "fleet" ? "Gestión de conductores" : section === "admin" ? "Configuración de cuenta" : section === "support" ? "Soporte técnico" : "Supervisión telemática activa"}</h1></div>
          <div className={styles.topActions}><span className={styles.updated}>Actualizado {lastUpdated}</span><button className={styles.refreshButton} onClick={() => { setLastUpdated("justo ahora"); showToast("Panel actualizado."); }}>↻ Actualizar</button><div className={styles.userBadge}><span>CM</span><div><strong>Administrador</strong><small>Control total</small></div></div></div>
        </header>

        <div className={styles.dashboard} id="overview">
          {section === "overview" && <SummaryPanel activeCount={activeCount} vehicleCount={vehicles.length} openAlerts={openAlerts} alerts={alerts} onFleet={() => go("fleet")} />}
          {section === "fleet" && <><FleetPanel vehicles={filtered} search={search} alerts={alerts} selectedId={selected.id} onSearch={setSearch} onAdd={() => { setEditing(null); setModal("driver"); }} onSelect={selectDriver} onEdit={(vehicle) => { setEditing(vehicle); setModal("driver"); }} onDelete={(vehicle) => { setSelected(vehicle); setModal("delete"); }} /><DriverWorkspace vehicle={selected} tab={driverTab} setTab={setDriverTab} alerts={alerts[selected.id] ?? []} onAlert={updateAlert} onToast={showToast} /></>}
          {section === "admin" && <AdminSettings onToast={showToast} />}
          {section === "support" && <SupportPanel onToast={showToast} />}
        </div>
      </section>

      {modal === "driver" && <DriverModal editing={editing} onClose={() => setModal(null)} onSave={(vehicle) => { if (editing) setVehicles((current) => current.map((item) => item.id === editing.id ? vehicle : item)); else setVehicles((current) => [...current, vehicle]); setSelected(vehicle); setModal(null); showToast("Datos del conductor guardados como borrador local."); }} />}
      {modal === "delete" && <Modal title="¿Eliminar conductor?" onClose={() => setModal(null)}><p className={styles.modalCopy}>Se quitará <strong>{selected.id}</strong> de la vista administrativa local. La eliminación definitiva requerirá autorización del backend.</p><div className={styles.modalActions}><button onClick={() => setModal(null)}>Cancelar</button><button className={styles.dangerButton} onClick={deleteDriver}>Confirmar eliminación</button></div></Modal>}
      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}

function SideButton({ active, onClick, icon, badge, children }: { active: boolean; onClick: () => void; icon: string; badge?: string; children: ReactNode }) { return <button className={active ? styles.navActive : ""} onClick={onClick}><span>{icon}</span>{children}{badge && <b>{badge}</b>}</button>; }
function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) { return <article className={`${styles.metric} ${styles[`metric${tone}`]}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }

function SummaryPanel({ activeCount, vehicleCount, openAlerts, alerts, onFleet }: { activeCount: number; vehicleCount: number; openAlerts: number; alerts: Record<string, AlertItem[]>; onFleet: () => void }) {
  const history = [
    { label: "Alertas abiertas", value: openAlerts, tone: "chartRed" },
    { label: "Alertas resueltas", value: 7, tone: "chartGreen" },
    { label: "Eventos registrados", value: 18, tone: "chartBlue" },
  ];
  const resolved = Object.values(alerts).flat().filter((alert) => alert.state === "Resuelta");
  return <>
    <div className={styles.noticeBar}><span>●</span><p><strong>Operación estable.</strong> {activeCount} de {vehicleCount} unidades transmitiendo telemetría.</p><button onClick={onFleet}>Gestionar conductores →</button></div>
    <div className={styles.metrics}><Metric label="Unidades activas" value={String(activeCount).padStart(2, "0")} detail={`de ${vehicleCount} registradas`} tone="blue" /><Metric label="Eventos hoy" value="08" detail="2 requieren atención" tone="cyan" /><Metric label="Telemetría recibida" value="98.6%" detail="últimas 24 horas" tone="green" /><Metric label="Alertas abiertas" value={String(openAlerts).padStart(2, "0")} detail="revisión recomendada" tone="orange" /></div>
    <div className={styles.summaryGrid}>
      <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>01 / TENDENCIA OPERATIVA</span><h2>Actividad de la flota</h2><p>Lectura general de eventos y alertas de las últimas 24 horas.</p></div><span className={styles.liveTag}>● Actualizado</span></div><div className={styles.chartBars}>{[52, 68, 44, 81, 63, 92, 74].map((height, index) => <div className={styles.chartColumn} key={index}><span style={{ height: `${height}%` }} /><small>{["L", "M", "X", "J", "V", "S", "D"][index]}</small></div>)}</div></section>
      <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>02 / ESTADO HISTÓRICO</span><h2>Resumen de eventos</h2></div></div><div className={styles.historyList}>{history.map((item) => <div className={styles.historyItem} key={item.label}><span className={`${styles.historyDot} ${styles[item.tone]}`} /><div><strong>{item.value}</strong><small>{item.label}</small></div></div>)}</div></section>
    </div>
    <section className={`${styles.panel} ${styles.summaryHistory}`}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>03 / REGISTRO HISTÓRICO</span><h2>Alertas solucionadas</h2><p>Eventos que ya fueron atendidos por el administrador.</p></div><button className={styles.linkButton} onClick={onFleet}>Ver conductores →</button></div><div className={styles.historyTable}>{resolved.map((alert) => <div className={styles.historyRow} key={alert.id}><span className={styles.resolvedDot} /><div><strong>{alert.title}</strong><small>{alert.detail} · {alert.id}</small></div><b>Resuelta</b></div>)}</div></section>
  </>;
}

function SupportPanel({ onToast }: { onToast: (message: string) => void }) {
  return <section className={styles.supportPanel}><div className={styles.panelHeader}><div><span className={styles.sectionLabel}>01 / CENTRO DE AYUDA</span><h2>Soporte técnico de Sigil.IA</h2><p>Obtén ayuda para la plataforma, los dispositivos ESP32 y la operación de tu flota.</p></div><span className={styles.supportStatus}>● Soporte disponible</span></div><div className={styles.supportGrid}><article className={styles.supportCard}><span>◉</span><h3>Incidencia técnica</h3><p>Reporta fallas de telemetría, conexión o funcionamiento del dashboard.</p><button onClick={() => onToast("Formulario de incidencia preparado para conectar con soporte.")}>Abrir incidencia →</button></article><article className={styles.supportCard}><span>?</span><h3>Guía de operación</h3><p>Consulta cómo administrar conductores, alertas, GPS y registros históricos.</p><button onClick={() => onToast("La documentación operativa estará disponible en la siguiente versión.")}>Ver documentación →</button></article><article className={styles.supportCard}><span>☎</span><h3>Contacto de soporte</h3><p>Canal para solicitar asistencia con la instalación o los sensores.</p><button onClick={() => onToast("Solicitud de contacto preparada para el equipo técnico.")}>Contactar soporte →</button></article></div><div className={styles.supportNotice}><strong>Antes de solicitar ayuda</strong><span>Ten a la mano el ID del conductor, dispositivo ESP32, hora del evento y captura de la alerta.</span></div></section>;
}

function FleetPanel({ vehicles, search, alerts, selectedId, onSearch, onAdd, onSelect, onEdit, onDelete }: { vehicles: Vehicle[]; search: string; alerts: Record<string, AlertItem[]>; selectedId: string; onSearch: (value: string) => void; onAdd: () => void; onSelect: (vehicle: Vehicle) => void; onEdit: (vehicle: Vehicle) => void; onDelete: (vehicle: Vehicle) => void }) {
  return <section className={styles.panel} id="fleet">
    <div className={styles.panelHeader}><div><span className={styles.sectionLabel}>01 / CRUD DE CONDUCTORES</span><h2>Conductores y dispositivos ESP32</h2><p>Busca por ID o nombre y selecciona un conductor para desplegar su detalle.</p></div><button className={styles.primaryButton} onClick={onAdd}>+ Alta de conductor</button></div>
    <div className={styles.fleetToolbar}><label>⌕ <input className={styles.searchBox} value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por ID o nombre..." /></label><span>{vehicles.length} resultados</span></div>
    <div className={styles.tableWrap}><table><thead><tr><th>Unidad / conductor</th><th>Dispositivo</th><th>Estado</th><th>Última ubicación</th><th>Señal</th><th>CRUD</th></tr></thead><tbody>
      {vehicles.length ? vehicles.map((vehicle) => {
        const hasAlert = alerts[vehicle.id]?.some((alert) => alert.state === "En proceso") ?? false;
        return <tr key={vehicle.id} className={`${styles.driverRow} ${hasAlert ? styles.driverRowAlert : ""} ${selectedId === vehicle.id ? styles.driverRowSelected : ""}`}>
          <td><button type="button" className={styles.driverSelect} onClick={() => onSelect(vehicle)}><strong>{vehicle.id}</strong><span>{vehicle.driver}</span>{hasAlert && <em className={styles.alertFlag}>Alerta activa</em>}</button></td>
          <td><code>{vehicle.device}</code></td>
          <td><span className={`${styles.status} ${hasAlert ? styles.statusAlert : vehicle.status === "Activo" ? styles.statusActive : vehicle.status === "Atención" ? styles.statusWarning : styles.statusOffline}`}><i />{hasAlert ? "Alerta activa" : vehicle.status}</span></td>
          <td>{vehicle.location}</td><td>{vehicle.lastSeen}</td>
          <td><div className={styles.rowActions}><button onClick={() => onSelect(vehicle)}>Ver</button><button onClick={() => onEdit(vehicle)}>Editar</button><button className={styles.dangerAction} onClick={() => onDelete(vehicle)}>Eliminar</button></div></td>
        </tr>;
      }) : <tr><td colSpan={6}>No hay conductores que coincidan con la búsqueda.</td></tr>}
    </tbody></table></div>
  </section>;
}

function DriverWorkspace({ vehicle, tab, setTab, alerts, onAlert, onToast }: { vehicle: Vehicle; tab: string; setTab: (tab: string) => void; alerts: AlertItem[]; onAlert: (id: string) => void; onToast: (message: string) => void }) {
  return <section className={styles.driverWorkspace} id={`driver-detail-${vehicle.id}`}>
    <div className={styles.driverHeader}><div><span className={styles.sectionLabel}>02 / CONDUCTOR SELECCIONADO</span><h2>{vehicle.driver} <small>{vehicle.id}</small></h2><p>{vehicle.device} · {vehicle.location}</p></div><span className={`${styles.status} ${vehicle.status === "Activo" ? styles.statusActive : styles.statusWarning}`}><i />{vehicle.status}</span></div>
    <nav className={styles.detailTabs} aria-label="Detalle del conductor">{[["resumen", "Resumen"], ["alerts", "Alertas"], ["gps", "GPS"], ["contact", "Contactar"], ["logs", "Logs y registros"]].map(([id, label]) => <button key={id} className={tab === id ? styles.detailTabActive : styles.detailTab} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {tab === "resumen" && <div className={styles.detailGrid}><DetailCard title="Estado ESP32" value="Conectado" detail="Señal estable · 98.6%" /><DetailCard title="Último evento" value={alerts[0]?.title ?? "Sin eventos"} detail={alerts[0]?.detail ?? "Sin actividad reciente"} /><DetailCard title="GPS" value="19.4270, -99.1677" detail={vehicle.location} /></div>}
    {tab === "alerts" && <AlertTable alerts={alerts} onAlert={onAlert} />}
    {tab === "gps" && <div className={styles.driverMap}><div className={styles.mapGrid} /><div className={styles.driverPin}>● {vehicle.id}</div><p>Ruta y posición de {vehicle.driver}. La ubicación real se conectará al proveedor GPS.</p></div>}
    {tab === "contact" && <div className={styles.contactModule}><div><span className={styles.contactAvatar}>{vehicle.driver.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span><h3>Contactar al conductor</h3><p>{vehicle.driver} · Teléfono registrado en el backend.</p></div><button className={styles.primaryButton} onClick={() => onToast(`Solicitud de contacto preparada para ${vehicle.driver}.`)}>Solicitar contacto</button></div>}
    {tab === "logs" && <LogTable vehicle={vehicle} />}
  </section>;
}

function DetailCard({ title, value, detail }: { title: string; value: string; detail: string }) { return <article className={styles.detailCard}><span>{title}</span><strong>{value}</strong><small>{detail}</small></article>; }
function AlertTable({ alerts, onAlert }: { alerts: AlertItem[]; onAlert: (id: string) => void }) { return <div className={styles.eventList}>{alerts.map((alert) => <div className={styles.eventRow} key={alert.id}><i className={alert.state === "Resuelta" ? styles.resolvedDot : styles.processDot} /><div><strong>{alert.title}</strong><span>{alert.detail} · {alert.id}</span></div><button onClick={() => onAlert(alert.id)} className={alert.state === "Resuelta" ? styles.resolved : styles.process}>{alert.state}</button></div>)}</div>; }
function LogTable({ vehicle }: { vehicle: Vehicle }) { return <div className={styles.eventList}><div className={styles.eventRow}><i className={styles.resolvedDot} /><div><strong>Telemetría recibida</strong><span>{vehicle.lastSeen} · {vehicle.device}</span></div><code>OK</code></div><div className={styles.eventRow}><i className={styles.processDot} /><div><strong>Evento operativo registrado</strong><span>Hoy 10:24 · Sistema</span></div><code>INFO</code></div><div className={styles.eventRow}><i className={styles.resolvedDot} /><div><strong>Sesión de administrador</strong><span>Hoy 09:02 · MFA confirmado</span></div><code>AUTH</code></div></div>; }
function AdminSettings({ onToast }: { onToast: (message: string) => void }) { return <section className={styles.adminSettings} id="admin"><div><span className={styles.sectionLabel}>01 / CUENTA DEL ADMINISTRADOR</span><h2>Configuración separada de la flota</h2><p>Gestiona tus datos, seguridad y preferencias sin mezclarlos con los conductores.</p></div><div className={styles.settingsGrid}><label>Nombre completo<input defaultValue="Carlos Méndez R." /></label><label>Correo corporativo<input defaultValue="admin@sigil.ia" type="email" /></label><label>Teléfono de recuperación<input defaultValue="+52 999 123 4567" type="tel" /></label><label>Zona horaria<input defaultValue="America/Mexico_City" /></label></div><div className={styles.settingsSecurity}><div><strong>Seguridad de cuenta</strong><span>MFA facial activo · última validación hoy</span></div><button className={styles.primaryButton} onClick={() => onToast("Cambios de configuración preparados para guardar.")}>Guardar configuración</button></div></section>; }
function DriverModal({ editing, onClose, onSave }: { editing: Vehicle | null; onClose: () => void; onSave: (vehicle: Vehicle) => void }) { return <Modal title={editing ? "Editar conductor" : "Alta de nuevo conductor"} onClose={onClose}><form className={styles.modalForm} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave({ id: String(data.get("id")), driver: String(data.get("driver")), device: String(data.get("device")), status: editing?.status ?? "Activo", location: editing?.location ?? "Sin ubicación", lastSeen: editing?.lastSeen ?? "Ahora" }); }}><label>ID de conductor<input name="id" defaultValue={editing?.id} required placeholder="SIG-025" /></label><label>Nombre completo<input name="driver" defaultValue={editing?.driver} required placeholder="Ej. Ana García" /></label><label>Dispositivo ESP32<input name="device" defaultValue={editing?.device} required placeholder="ESP32-XXXX" /></label><div className={styles.modalActions}><button type="button" onClick={onClose}>Cancelar</button><button className={styles.primaryButton} type="submit">Guardar conductor</button></div></form></Modal>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}><div className={styles.modal} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className={styles.modalHeader}><h2>{title}</h2><button onClick={onClose} aria-label="Cerrar">×</button></div>{children}</div></div>; }
