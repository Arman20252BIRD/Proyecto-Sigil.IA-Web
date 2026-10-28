
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del Pool de conexiones para PostgreSQL
export const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'sigil_db',
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || '5432'),
    connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
    console.log('Conexión exitosa a la base de datos PostgreSQL');
});

pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error);
});