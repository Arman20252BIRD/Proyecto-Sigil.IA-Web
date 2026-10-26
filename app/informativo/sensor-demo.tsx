"use client";

import { useState } from "react";
import styles from "./page.module.css";

const sensors = [
  { id: "sonido", label: "Sonido · habitáculo", short: "MIC", metric: "82 dB", detail: "Detecta patrones acústicos anómalos dentro del habitáculo.", x: "34%", y: "43%" },
  { id: "movimiento", label: "Movimiento · chasis", short: "IMU", metric: "0.84 g", detail: "Registra impactos, vibración y cambios bruscos de aceleración.", x: "53%", y: "59%" },
  { id: "peso", label: "Peso · carga", short: "LOAD", metric: "640 kg", detail: "Compara la carga y distribución del vehículo en tiempo real.", x: "62%", y: "43%" },
] as const;

export default function SensorDemo() {
  const [active, setActive] = useState<(typeof sensors)[number]["id"]>("sonido");
  const current = sensors.find((sensor) => sensor.id === active) ?? sensors[0];

  return (
    <div className={styles.sensorDemo} aria-label="Demostración interactiva de sensores">
      <div className={styles.demoTop}><span><i /> Ejemplo de integración</span><b>ESP32 / EDGE / AWS</b></div>
      <div className={`${styles.demoScene} ${styles[`sensor${active}`]}`}>
        <div className={styles.signalWave} />
        <svg className={styles.vehicleIllustration} viewBox="0 0 800 360" role="img" aria-label="Ubicación conceptual de sensores y módulos en un vehículo">
          <path className={styles.carOutline} d="M42 221c4-25 26-44 58-53l72-18 72-18c28-39 72-61 139-64l104 2c62 3 111 19 157 47l70 21c27 8 42 27 46 57l4 28c2 17-9 27-27 27H77c-22 0-38-11-35-29Z" />
          <path className={styles.carGlass} d="M264 129c27-39 67-51 119-53h97c48 2 84 11 119 30l48 25H250l14-2ZM480 129V77M263 129h217" />
          <path className={styles.carDetail} d="M47 213h67M641 213h110M226 132v96M480 132v96M535 139v89M276 151h16M505 151h16" />
          <path className={styles.carLight} d="M56 173c14-8 26-10 41-9l-18 15-24 3ZM746 163l25 5-3 16-24-5Z" />
          <circle className={styles.carWheel} cx="177" cy="229" r="34" /><circle className={styles.carHub} cx="177" cy="229" r="14" />
          <circle className={styles.carWheel} cx="625" cy="229" r="34" /><circle className={styles.carHub} cx="625" cy="229" r="14" />
          <path className={styles.moduleLine} d="M330 130v-38M405 192v-59M548 145v-42M560 227v31" />
          <text className={styles.moduleText} x="301" y="78">MIC</text><text className={styles.moduleText} x="382" y="127">ESP32</text><text className={styles.moduleText} x="528" y="96">GPS</text><text className={styles.moduleText} x="540" y="278">LOAD</text>
        </svg>
        {sensors.map((sensor) => <button key={sensor.id} className={`${styles.sensorNode} ${active === sensor.id ? styles.sensorNodeActive : ""}`} style={{ left: sensor.x, top: sensor.y }} onClick={() => setActive(sensor.id)} aria-label={`Ver sensor de ${sensor.label}`}><i className={`${styles.sensorChipIcon} ${styles[`chip${sensor.id}`]}`} /><strong>{sensor.short}</strong></button>)}
        <div className={styles.espNode}><strong>ESP32</strong><small>procesamiento edge</small></div>
        <div className={styles.dataFlow}><span /> <span /> <span /></div>
        <div className={styles.cloudNode}>AWS</div>
        <div className={styles.moduleStrip}><span>ESP32</span><span>GPS NEO-6M</span><span>MPU-6050</span><span>Celda de carga</span></div>
      </div>
      <div className={styles.sensorInfo}><div><span className={styles.sensorEyebrow}>Sensor seleccionado</span><h3>{current.label}<b>{current.metric}</b></h3><p>{current.detail}</p></div><div className={styles.sensorTabs}>{sensors.map((sensor) => <button key={sensor.id} className={active === sensor.id ? styles.tabActive : ""} onClick={() => setActive(sensor.id)}>{sensor.label}</button>)}</div></div>
      <div className={styles.demoLegend}><span><i className={styles.legendCyan} /> Captura</span><span><i className={styles.legendBlue} /> Inferencia</span><span><i className={styles.legendPurple} /> Almacenamiento</span></div>
    </div>
  );
}
