/**
 * Controlador para operaciones relacionadas con Calculadoras guardadas
 */

const pool = require('../config/database');

const normalizarDiaPago = (valor) => {
    if (!valor) return null;
    const texto = String(valor).trim();
    if (/^\d{1,2}$/.test(texto)) {
        return texto;
    }
    if (/^\d{1,2}\/\d{1,2}$/.test(texto)) {
        return texto.split('/')[0];
    }
    return texto;
};

const calculadorasController = {
    /**
     * Guardar calculadora en BD
     */
    guardarCalculadora: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const {
                nombre,
                fechaCompra,
                precioCompra,
                cantidadPartida,
                ticker,
                tasa,
                formula,
                rentaTNA,
                spread,
                tipoInteresDias,
                fechaEmision,
                fechaPrimeraRenta,
                diasRestarFechaFinDev,
                fechaAmortizacion,
                porcentajeAmortizacion,
                periodicidad,
                intervaloInicio,
                intervaloFin,
                ajusteCER
            } = req.body;

            // Validar campos requeridos
            if (!nombre || nombre.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'El nombre de la calculadora es requerido'
                });
            }

            // Convertir fechaCompra de DD/MM/AAAA a YYYY-MM-DD si es necesario
            let fechaCompraFormato = null;
            if (fechaCompra) {
                if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(fechaCompra)) {
                    const partes = fechaCompra.split(/[-\/]/);
                    fechaCompraFormato = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else {
                    fechaCompraFormato = fechaCompra;
                }
            }

            // Convertir fechaEmision de DD/MM/AAAA a YYYY-MM-DD si es necesario
            let fechaEmisionFormato = null;
            if (fechaEmision) {
                if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(fechaEmision)) {
                    const partes = fechaEmision.split(/[-\/]/);
                    fechaEmisionFormato = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else {
                    fechaEmisionFormato = fechaEmision;
                }
            }

            // Convertir fechaAmortizacion de DD/MM/AAAA a YYYY-MM-DD si es necesario
            let fechaAmortizacionFormato = null;
            if (fechaAmortizacion) {
                if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(fechaAmortizacion)) {
                    const partes = fechaAmortizacion.split(/[-\/]/);
                    fechaAmortizacionFormato = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else {
                    fechaAmortizacionFormato = fechaAmortizacion;
                }
            }

            const fechaPrimeraRentaNormalizada = normalizarDiaPago(fechaPrimeraRenta);
            
            const query = `
                INSERT INTO calculadoras (
                    nombre, fecha_compra, precio_compra, cantidad_partida,
                    ticker, tasa, formula, renta_tna, spread, tipo_interes_dias,
                    fecha_emision, fecha_primera_renta, dias_restar_fecha_fin_dev,
                    fecha_amortizacion, porcentaje_amortizacion, periodicidad,
                    intervalo_inicio, intervalo_fin, ajuste_cer
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING id, nombre, fecha_creacion
            `;

            const result = await pool.query(query, [
                nombre.trim(),
                fechaCompraFormato,
                precioCompra || null,
                cantidadPartida || null,
                ticker || null,
                tasa || null,
                formula || null,
                rentaTNA || null,
                spread || null,
                tipoInteresDias !== undefined ? tipoInteresDias : null,
                fechaEmisionFormato,
                fechaPrimeraRentaNormalizada,
                diasRestarFechaFinDev !== undefined ? diasRestarFechaFinDev : -1,
                fechaAmortizacionFormato,
                porcentajeAmortizacion || null,
                periodicidad || null,
                intervaloInicio || null,
                intervaloFin || null,
                ajusteCER === true || ajusteCER === 'true'
            ]);

            res.json({
                success: true,
                calculadora: result.rows[0],
                message: 'Calculadora guardada exitosamente'
            });

        } catch (error) {
            console.error('Error al guardar calculadora:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al guardar calculadora'
            });
        }
    },

    /**
     * Actualizar calculadora existente
     */
    actualizarCalculadora: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { id } = req.params;
            const {
                nombre,
                fechaCompra,
                precioCompra,
                cantidadPartida,
                ticker,
                tasa,
                formula,
                rentaTNA,
                spread,
                tipoInteresDias,
                fechaEmision,
                fechaPrimeraRenta,
                diasRestarFechaFinDev,
                fechaAmortizacion,
                porcentajeAmortizacion,
                periodicidad,
                intervaloInicio,
                intervaloFin,
                ajusteCER
            } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID de calculadora requerido'
                });
            }

            // Convertir fechas de DD/MM/AAAA a YYYY-MM-DD si es necesario
            let fechaCompraFormato = null;
            if (fechaCompra) {
                if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(fechaCompra)) {
                    const partes = fechaCompra.split(/[-\/]/);
                    fechaCompraFormato = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else {
                    fechaCompraFormato = fechaCompra;
                }
            }

            let fechaEmisionFormato = null;
            if (fechaEmision) {
                if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(fechaEmision)) {
                    const partes = fechaEmision.split(/[-\/]/);
                    fechaEmisionFormato = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else {
                    fechaEmisionFormato = fechaEmision;
                }
            }

            let fechaAmortizacionFormato = null;
            if (fechaAmortizacion) {
                if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(fechaAmortizacion)) {
                    const partes = fechaAmortizacion.split(/[-\/]/);
                    fechaAmortizacionFormato = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else {
                    fechaAmortizacionFormato = fechaAmortizacion;
                }
            }

            const fechaPrimeraRentaNormalizada = normalizarDiaPago(fechaPrimeraRenta);
            
            const query = `
                UPDATE calculadoras SET
                    nombre = $1,
                    fecha_compra = $2,
                    precio_compra = $3,
                    cantidad_partida = $4,
                    ticker = $5,
                    tasa = $6,
                    formula = $7,
                    renta_tna = $8,
                    spread = $9,
                    tipo_interes_dias = $10,
                    fecha_emision = $11,
                    fecha_primera_renta = $12,
                    dias_restar_fecha_fin_dev = $13,
                    fecha_amortizacion = $14,
                    porcentaje_amortizacion = $15,
                    periodicidad = $16,
                    intervalo_inicio = $17,
                    intervalo_fin = $18,
                    ajuste_cer = $19,
                    fecha_actualizacion = NOW()
                WHERE id = $20
                RETURNING id, nombre, fecha_creacion, fecha_actualizacion
            `;

            const result = await pool.query(query, [
                nombre.trim(),
                fechaCompraFormato,
                precioCompra || null,
                cantidadPartida || null,
                ticker || null,
                tasa || null,
                formula || null,
                rentaTNA || null,
                spread || null,
                tipoInteresDias !== undefined ? tipoInteresDias : null,
                fechaEmisionFormato,
                    fechaPrimeraRentaNormalizada,
                diasRestarFechaFinDev !== undefined ? diasRestarFechaFinDev : -1,
                fechaAmortizacionFormato,
                porcentajeAmortizacion || null,
                periodicidad || null,
                intervaloInicio || null,
                intervaloFin || null,
                ajusteCER === true || ajusteCER === 'true',
                id
            ]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Calculadora no encontrada'
                });
            }

            res.json({
                success: true,
                calculadora: result.rows[0],
                message: 'Calculadora actualizada exitosamente'
            });

        } catch (error) {
            console.error('Error al actualizar calculadora:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al actualizar calculadora'
            });
        }
    },

    /**
     * Eliminar calculadora
     */
    eliminarCalculadora: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID de calculadora requerido'
                });
            }

            const result = await pool.query(
                'DELETE FROM calculadoras WHERE id = $1 RETURNING id, nombre',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Calculadora no encontrada'
                });
            }

            res.json({
                success: true,
                message: 'Calculadora eliminada exitosamente'
            });

        } catch (error) {
            console.error('Error al eliminar calculadora:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al eliminar calculadora'
            });
        }
    },

    /**
     * Obtener lista de calculadoras guardadas
     */
    obtenerCalculadoras: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            // Verificar si la columna fecha_actualizacion existe
            let tieneFechaActualizacion = false;
            try {
                const checkColumn = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'calculadoras' 
                    AND column_name = 'fecha_actualizacion'
                `);
                tieneFechaActualizacion = checkColumn.rows.length > 0;
            } catch (error) {
                // Si falla la verificación, asumir que no existe
                tieneFechaActualizacion = false;
            }

            // Construir la consulta según si existe la columna
            let query;
            if (tieneFechaActualizacion) {
                query = 'SELECT id, nombre, fecha_creacion, fecha_actualizacion FROM calculadoras ORDER BY fecha_creacion DESC';
            } else {
                query = 'SELECT id, nombre, fecha_creacion, fecha_creacion as fecha_actualizacion FROM calculadoras ORDER BY fecha_creacion DESC';
            }

            const result = await pool.query(query);

            res.json({
                success: true,
                calculadoras: result.rows
            });

        } catch (error) {
            console.error('Error al obtener calculadoras:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener calculadoras'
            });
        }
    },

    /**
     * Cargar una calculadora específica por ID
     */
    cargarCalculadora: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID de calculadora requerido'
                });
            }

            const result = await pool.query(
                'SELECT * FROM calculadoras WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Calculadora no encontrada'
                });
            }

            const calculadora = result.rows[0];

            // Convertir fechas de YYYY-MM-DD a DD/MM/AAAA
            const convertirFecha = (fecha) => {
                if (!fecha) return null;
                const partes = fecha.toISOString().split('T')[0].split('-');
                return `${partes[2]}/${partes[1]}/${partes[0]}`;
            };

            const formatearDiaPago = (valor) => normalizarDiaPago(valor) ?? '';

            res.json({
                success: true,
                calculadora: {
                    id: calculadora.id,
                    nombre: calculadora.nombre,
                    // Datos Partida
                    fechaCompra: convertirFecha(calculadora.fecha_compra),
                    precioCompra: calculadora.precio_compra,
                    cantidadPartida: calculadora.cantidad_partida,
                    // Datos Especie
                    ticker: calculadora.ticker,
                    tasa: calculadora.tasa,
                    formula: calculadora.formula,
                    rentaTNA: calculadora.renta_tna,
                    spread: calculadora.spread,
                    tipoInteresDias: calculadora.tipo_interes_dias,
                    fechaEmision: convertirFecha(calculadora.fecha_emision),
                    fechaPrimeraRenta: formatearDiaPago(calculadora.fecha_primera_renta),
                    diasRestarFechaFinDev: calculadora.dias_restar_fecha_fin_dev,
                    fechaAmortizacion: convertirFecha(calculadora.fecha_amortizacion),
                    porcentajeAmortizacion: calculadora.porcentaje_amortizacion,
                    periodicidad: calculadora.periodicidad,
                    intervaloInicio: calculadora.intervalo_inicio,
                    intervaloFin: calculadora.intervalo_fin,
                    ajusteCER: calculadora.ajuste_cer
                }
            });

        } catch (error) {
            console.error('Error al cargar calculadora:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al cargar calculadora'
            });
        }
    }
};

module.exports = calculadorasController;

