import styles from "./telemetry-widget.module.css";

export function TelemetryWidget() {
  return (
    <aside className={styles.widget} aria-label="Vista conceptual de telemetría SIGILIA">
      <div className={styles.widgetHeader}>
        <span><i /> Telemetría vehicular</span>
        <b>DEMO</b>
      </div>
      <div className={styles.widgetBody}>
        <div className={styles.signalGrid} />
        <div className={styles.routeLine} />
        <span className={`${styles.node} ${styles.nodeEsp}`}>ESP32</span>
        <span className={`${styles.node} ${styles.nodeGps}`}>GPS</span>
        <span className={`${styles.node} ${styles.nodeSensor}`}>SENSORES</span>
        <span className={`${styles.node} ${styles.nodeCloud}`}>PANEL</span>
        <span className={styles.pulse} />
      </div>
      <div className={styles.widgetFooter}>
        <span><i className={styles.cyan} /> Captura</span>
        <span><i className={styles.blue} /> Inferencia</span>
        <span><i className={styles.purple} /> Historial</span>
      </div>
    </aside>
  );
}
