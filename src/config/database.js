/**
 * Configuración de la base de datos PostgreSQL
 * Utiliza un pool de conexiones para mejor rendimiento
 */

const { Pool } = require('pg');

// Crear pool de conexiones
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20, // Máximo de conexiones en el pool
    idleTimeoutMillis: 30000, // Cerrar conexiones inactivas después de 30s
    connectionTimeoutMillis: 10000, // Timeout de conexión de 10s
});

// Manejo de errores del pool
pool.on('error', (err) => {
    console.error('Error inesperado en el pool de conexiones:', err);
});

module.exports = pool;

