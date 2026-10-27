
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del Pool de conexiones para PostgreSQL
export const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'sigil_db',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
});

pool.on('connect', () => {
    console.log('Conexión exitosa a la base de datos PostgreSQL');
});