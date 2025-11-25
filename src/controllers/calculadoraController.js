/**
 * Controlador principal de la calculadora
 * Maneja el renderizado de las diferentes vistas y operaciones con BD
 */

const pool = require('../config/database');

const calculadoraController = {
    /**
     * Renderiza la página principal de Calculadora
     */
    renderCalculadora: async (req, res) => {
        try {
            res.render('pages/calculadora', {
                title: 'Calculadora',
                activeMenu: 'calculadora',
                datos: []
            });
        } catch (error) {
            console.error('Error al renderizar Calculadora:', error);
            res.status(500).render('pages/404', {
                title: 'Error',
                activeMenu: ''
            });
        }
    },

    /**
     * Renderiza la página de CER
     */
    renderCER: async (req, res) => {
        try {
            let datos = [];
            let total = 0;
            let pagina = 1;
            const porPagina = 50;

            if (pool) {
                try {
                    pagina = parseInt(req.query.pagina) || 1;
                    const offset = (pagina - 1) * porPagina;

                    const countResult = await pool.query('SELECT COUNT(*) as total FROM cer WHERE id_variable = 30');
                    total = parseInt(countResult.rows[0].total);

                    const result = await pool.query(
                        'SELECT fecha, valor, id_variable as idVariable FROM cer WHERE id_variable = 30 ORDER BY fecha DESC LIMIT $1 OFFSET $2',
                        [porPagina, offset]
                    );
                    datos = result.rows;
                } catch (error) {
                    console.error('Error al cargar datos de CER:', error);
                }
            }

            res.render('pages/cer', {
                title: 'CER',
                activeMenu: 'cer',
                datos: datos,
                pagina: pagina,
                total: total,
                porPagina: porPagina,
                totalPaginas: Math.ceil(total / porPagina)
            });
        } catch (error) {
            console.error('Error al renderizar CER:', error);
            res.status(500).render('pages/404', {
                title: 'Error',
                activeMenu: ''
            });
        }
    },

    /**
     * Renderiza la página de TAMAR
     */
    renderTAMAR: async (req, res) => {
        try {
            let datos = [];
            let total = 0;
            let pagina = 1;
            const porPagina = 50;

            if (pool) {
                try {
                    pagina = parseInt(req.query.pagina) || 1;
                    const offset = (pagina - 1) * porPagina;

                    const countResult = await pool.query('SELECT COUNT(*) as total FROM cer WHERE id_variable = 44');
                    total = parseInt(countResult.rows[0].total);

                    const result = await pool.query(
                        'SELECT fecha, valor, id_variable as idVariable FROM cer WHERE id_variable = 44 ORDER BY fecha DESC LIMIT $1 OFFSET $2',
                        [porPagina, offset]
                    );
                    datos = result.rows;
                } catch (error) {
                    console.error('Error al cargar datos de TAMAR:', error);
                }
            }

            res.render('pages/tamar', {
                title: 'TAMAR',
                activeMenu: 'tamar',
                datos: datos,
                pagina: pagina,
                total: total,
                porPagina: porPagina,
                totalPaginas: Math.ceil(total / porPagina)
            });
        } catch (error) {
            console.error('Error al renderizar TAMAR:', error);
            res.status(500).render('pages/404', {
                title: 'Error',
                activeMenu: ''
            });
        }
    },

    /**
     * Renderiza la página de BADLAR
     */
    renderBADLAR: async (req, res) => {
        try {
            let datos = [];
            let total = 0;
            let pagina = 1;
            const porPagina = 50;

            if (pool) {
                try {
                    pagina = parseInt(req.query.pagina) || 1;
                    const offset = (pagina - 1) * porPagina;

                    const countResult = await pool.query('SELECT COUNT(*) as total FROM cer WHERE id_variable = 7');
                    total = parseInt(countResult.rows[0].total);

                    const result = await pool.query(
                        'SELECT fecha, valor, id_variable as idVariable FROM cer WHERE id_variable = 7 ORDER BY fecha DESC LIMIT $1 OFFSET $2',
                        [porPagina, offset]
                    );
                    datos = result.rows;
                } catch (error) {
                    console.error('Error al cargar datos de BADLAR:', error);
                }
            }

            res.render('pages/badlar', {
                title: 'BADLAR',
                activeMenu: 'badlar',
                datos: datos,
                pagina: pagina,
                total: total,
                porPagina: porPagina,
                totalPaginas: Math.ceil(total / porPagina)
            });
        } catch (error) {
            console.error('Error al renderizar BADLAR:', error);
            res.status(500).render('pages/404', {
                title: 'Error',
                activeMenu: ''
            });
        }
    },

    /**
     * Renderiza la página de Feriados
     */
    renderFeriados: async (req, res) => {
        try {
            let datos = [];
            let total = 0;
            let pagina = 1;
            const porPagina = 50;

            if (pool) {
                try {
                    pagina = parseInt(req.query.pagina) || 1;
                    const offset = (pagina - 1) * porPagina;

                    const countResult = await pool.query('SELECT COUNT(*) as total FROM feriados');
                    total = parseInt(countResult.rows[0].total);

                    const result = await pool.query(
                        'SELECT fecha, nombre, tipo FROM feriados ORDER BY fecha DESC LIMIT $1 OFFSET $2',
                        [porPagina, offset]
                    );
                    datos = result.rows;
                } catch (error) {
                    console.error('Error al cargar datos de Feriados:', error);
                }
            }

            res.render('pages/feriados', {
                title: 'Feriados',
                activeMenu: 'feriados',
                datos: datos,
                pagina: pagina,
                total: total,
                porPagina: porPagina,
                totalPaginas: Math.ceil(total / porPagina)
            });
        } catch (error) {
            console.error('Error al renderizar Feriados:', error);
            res.status(500).render('pages/404', {
                title: 'Error',
                activeMenu: ''
            });
        }
    },

    /**
     * Guardar datos de CER en BD
     */
    guardarCER: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { datos } = req.body;

            if (!datos || !Array.isArray(datos) || datos.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No hay datos de CER para guardar'
                });
            }

            const batchSize = 500;
            let totalActualizados = 0;
            
            for (let i = 0; i < datos.length; i += batchSize) {
                const batch = datos.slice(i, i + batchSize);
                
                const values = [];
                const placeholders = [];
                const params = [];
                
                batch.forEach((item, index) => {
                    const baseIndex = index * 3;
                    placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`);
                    params.push(item.fecha, item.valor, item.idVariable || 30);
                });
                
                const query = `
                    INSERT INTO cer (fecha, valor, id_variable)
                    VALUES ${placeholders.join(', ')}
                    ON CONFLICT (fecha, id_variable) DO UPDATE SET
                        valor = EXCLUDED.valor
                `;
                
                await pool.query(query, params);
                totalActualizados += batch.length;
            }

            res.json({
                success: true,
                actualizados: totalActualizados,
                message: `Se guardaron/actualizaron ${totalActualizados} registros de CER`
            });

        } catch (error) {
            console.error('Error al guardar CER:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al guardar datos de CER'
            });
        }
    },

    /**
     * Guardar datos de TAMAR en BD
     */
    guardarTAMAR: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { datos } = req.body;

            if (!datos || !Array.isArray(datos) || datos.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No hay datos de TAMAR para guardar'
                });
            }

            const batchSize = 500;
            let totalActualizados = 0;
            
            for (let i = 0; i < datos.length; i += batchSize) {
                const batch = datos.slice(i, i + batchSize);
                
                const placeholders = [];
                const params = [];
                
                batch.forEach((item, index) => {
                    const baseIndex = index * 3;
                    placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`);
                    params.push(item.fecha, item.valor, 44);
                });
                
                const query = `
                    INSERT INTO cer (fecha, valor, id_variable)
                    VALUES ${placeholders.join(', ')}
                    ON CONFLICT (fecha, id_variable) DO UPDATE SET
                        valor = EXCLUDED.valor
                `;
                
                await pool.query(query, params);
                totalActualizados += batch.length;
            }

            res.json({
                success: true,
                actualizados: totalActualizados,
                message: `Se guardaron/actualizaron ${totalActualizados} registros de TAMAR`
            });

        } catch (error) {
            console.error('Error al guardar TAMAR:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al guardar datos de TAMAR'
            });
        }
    },

    /**
     * Guardar datos de BADLAR en BD
     */
    guardarBADLAR: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { datos } = req.body;

            if (!datos || !Array.isArray(datos) || datos.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No hay datos de BADLAR para guardar'
                });
            }

            const batchSize = 500;
            let totalActualizados = 0;
            
            for (let i = 0; i < datos.length; i += batchSize) {
                const batch = datos.slice(i, i + batchSize);
                
                const placeholders = [];
                const params = [];
                
                batch.forEach((item, index) => {
                    const baseIndex = index * 3;
                    placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`);
                    params.push(item.fecha, item.valor, 7);
                });
                
                const query = `
                    INSERT INTO cer (fecha, valor, id_variable)
                    VALUES ${placeholders.join(', ')}
                    ON CONFLICT (fecha, id_variable) DO UPDATE SET
                        valor = EXCLUDED.valor
                `;
                
                await pool.query(query, params);
                totalActualizados += batch.length;
            }

            res.json({
                success: true,
                actualizados: totalActualizados,
                message: `Se guardaron/actualizaron ${totalActualizados} registros de BADLAR`
            });

        } catch (error) {
            console.error('Error al guardar BADLAR:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al guardar datos de BADLAR'
            });
        }
    },

    /**
     * Guardar datos de Feriados en BD
     */
    guardarFeriados: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { datos } = req.body;

            if (!datos || !Array.isArray(datos) || datos.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No hay datos de feriados para guardar'
                });
            }

            const batchSize = 500;
            let totalActualizados = 0;
            
            for (let i = 0; i < datos.length; i += batchSize) {
                const batch = datos.slice(i, i + batchSize);
                
                const placeholders = [];
                const params = [];
                
                batch.forEach((item, index) => {
                    const baseIndex = index * 3;
                    placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`);
                    params.push(item.fecha, item.nombre || '', item.tipo || '');
                });
                
                const query = `
                    INSERT INTO feriados (fecha, nombre, tipo)
                    VALUES ${placeholders.join(', ')}
                    ON CONFLICT (fecha) DO UPDATE SET
                        nombre = EXCLUDED.nombre,
                        tipo = EXCLUDED.tipo
                `;
                
                await pool.query(query, params);
                totalActualizados += batch.length;
            }

            res.json({
                success: true,
                actualizados: totalActualizados,
                message: `Se guardaron/actualizaron ${totalActualizados} feriados`
            });

        } catch (error) {
            console.error('Error al guardar feriados:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al guardar datos de feriados'
            });
        }
    },

    /**
     * Guardar un feriado individual
     */
    guardarFeriadoIndividual: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { fecha, nombre, tipo } = req.body;

            if (!fecha) {
                return res.status(400).json({
                    success: false,
                    error: 'La fecha es requerida'
                });
            }

            const query = `
                INSERT INTO feriados (fecha, nombre, tipo)
                VALUES ($1, $2, $3)
                ON CONFLICT (fecha) DO UPDATE SET
                    nombre = EXCLUDED.nombre,
                    tipo = EXCLUDED.tipo
            `;

            await pool.query(query, [fecha, nombre || '', tipo || '']);

            res.json({
                success: true,
                message: 'Feriado guardado exitosamente'
            });

        } catch (error) {
            console.error('Error al guardar feriado individual:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al guardar feriado'
            });
        }
    },

    /**
     * Obtener datos de CER desde BD
     */
    obtenerCERBD: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { desde, hasta } = req.query;

            if (desde && hasta) {
                const result = await pool.query(
                    'SELECT fecha, valor, id_variable as idVariable FROM cer WHERE fecha >= $1 AND fecha <= $2 AND id_variable = 30 ORDER BY fecha ASC',
                    [desde, hasta]
                );
                return res.json({
                    success: true,
                    datos: result.rows
                });
            }

            const result = await pool.query(
                'SELECT fecha, valor, id_variable as idVariable FROM cer WHERE id_variable = 30 ORDER BY fecha DESC'
            );

            res.json({
                success: true,
                datos: result.rows
            });

        } catch (error) {
            console.error('Error al obtener CER de BD:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener datos de CER'
            });
        }
    },

    /**
     * Obtener datos de TAMAR desde BD
     */
    obtenerTAMARBD: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { desde, hasta } = req.query;

            if (desde && hasta) {
                const result = await pool.query(
                    'SELECT fecha, valor, id_variable as idVariable FROM cer WHERE fecha >= $1 AND fecha <= $2 AND id_variable = 44 ORDER BY fecha ASC',
                    [desde, hasta]
                );
                return res.json({
                    success: true,
                    datos: result.rows
                });
            }

            const result = await pool.query(
                'SELECT fecha, valor, id_variable as idVariable FROM cer WHERE id_variable = 44 ORDER BY fecha DESC'
            );

            res.json({
                success: true,
                datos: result.rows
            });

        } catch (error) {
            console.error('Error al obtener TAMAR de BD:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener datos de TAMAR'
            });
        }
    },

    /**
     * Obtener datos de BADLAR desde BD
     */
    obtenerBADLARBD: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { desde, hasta } = req.query;

            if (desde && hasta) {
                const result = await pool.query(
                    'SELECT fecha, valor, id_variable as idVariable FROM cer WHERE fecha >= $1 AND fecha <= $2 AND id_variable = 7 ORDER BY fecha ASC',
                    [desde, hasta]
                );
                return res.json({
                    success: true,
                    datos: result.rows
                });
            }

            const result = await pool.query(
                'SELECT fecha, valor, id_variable as idVariable FROM cer WHERE id_variable = 7 ORDER BY fecha DESC'
            );

            res.json({
                success: true,
                datos: result.rows
            });

        } catch (error) {
            console.error('Error al obtener BADLAR de BD:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener datos de BADLAR'
            });
        }
    },

    /**
     * Obtener datos de Feriados desde BD
     */
    obtenerFeriadosBD: async (req, res) => {
        try {
            if (!pool) {
                return res.status(503).json({
                    success: false,
                    error: 'Base de datos no configurada'
                });
            }

            const { desde, hasta, pagina, porPagina } = req.query;
            
            console.log(`[obtenerFeriadosBD] Parámetros recibidos:`, { desde, hasta, pagina, porPagina });

            // Si NO se proporcionan desde y hasta, obtener TODOS los feriados
            if (!desde || !hasta) {
                // Si hay paginación sin filtro de fechas
                if (pagina && porPagina) {
                    const paginaNum = parseInt(pagina, 10);
                    const porPaginaNum = parseInt(porPagina, 10);
                    const offset = (paginaNum - 1) * porPaginaNum;

                    // Contar total
                    const countResult = await pool.query('SELECT COUNT(*) as total FROM feriados');
                    const total = parseInt(countResult.rows[0].total, 10);
                    const totalPaginas = Math.ceil(total / porPaginaNum);

                    // Obtener datos paginados
                    const result = await pool.query(
                        'SELECT fecha, nombre, tipo FROM feriados ORDER BY fecha DESC LIMIT $1 OFFSET $2',
                        [porPaginaNum, offset]
                    );

                    return res.json({
                        success: true,
                        datos: result.rows,
                        pagina: paginaNum,
                        porPagina: porPaginaNum,
                        total,
                        totalPaginas
                    });
                }

                // Sin paginación ni filtros
                const result = await pool.query(
                    'SELECT fecha, nombre, tipo FROM feriados ORDER BY fecha ASC'
                );

                return res.json({
                    success: true,
                    datos: result.rows
                });
            }

            // Si se proporcionan desde y hasta, obtener por rango de fechas
            // Validar formato YYYY-MM-DD
            const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!fechaRegex.test(desde) || !fechaRegex.test(hasta)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de fecha inválido. Use YYYY-MM-DD'
                });
            }

            // Validar que desde <= hasta
            if (desde > hasta) {
                return res.status(400).json({
                    success: false,
                    error: 'La fecha "desde" debe ser anterior o igual a la fecha "hasta"'
                });
            }

            // Si hay paginación con filtro de fechas
            if (pagina && porPagina) {
                const paginaNum = parseInt(pagina, 10);
                const porPaginaNum = parseInt(porPagina, 10);
                const offset = (paginaNum - 1) * porPaginaNum;

                // Contar total
                const countResult = await pool.query(
                    'SELECT COUNT(*) as total FROM feriados WHERE fecha >= $1::date AND fecha <= $2::date',
                    [desde, hasta]
                );
                const total = parseInt(countResult.rows[0].total, 10);
                const totalPaginas = Math.ceil(total / porPaginaNum);

                // Obtener datos paginados
                const result = await pool.query(
                    'SELECT fecha, nombre, tipo FROM feriados WHERE fecha >= $1::date AND fecha <= $2::date ORDER BY fecha ASC LIMIT $3 OFFSET $4',
                    [desde, hasta, porPaginaNum, offset]
                );

                return res.json({
                    success: true,
                    datos: result.rows,
                    pagina: paginaNum,
                    porPagina: porPaginaNum,
                    total,
                    totalPaginas
                });
            }

            // Sin paginación, solo filtro de fechas
            console.log(`[obtenerFeriadosBD] Ejecutando consulta SQL: fecha >= '${desde}' AND fecha <= '${hasta}'`);
            const result = await pool.query(
                'SELECT fecha, nombre, tipo FROM feriados WHERE fecha >= $1::date AND fecha <= $2::date ORDER BY fecha ASC',
                [desde, hasta]
            );
            
            console.log(`[obtenerFeriadosBD] Consulta exitosa, registros encontrados: ${result.rows.length}`);

            return res.json({
                success: true,
                datos: result.rows
            });

        } catch (error) {
            console.error('❌ Error al obtener Feriados de BD:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            
            // Si es un error de PostgreSQL, devolver un mensaje más descriptivo
            if (error.code && error.code.startsWith('22')) {
                return res.status(400).json({
                    success: false,
                    error: `Error de validación en la base de datos: ${error.message || 'Formato de fecha inválido'}`
                });
            }
            
            // Si es un error de sintaxis SQL o tabla no existe
            if (error.code && (error.code === '42P01' || error.code === '42601')) {
                return res.status(500).json({
                    success: false,
                    error: `Error en la base de datos: ${error.message || 'Tabla o consulta inválida'}`
                });
            }
            
            res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener datos de Feriados'
            });
        }
    },

    // Métodos de exportación CSV (stubs - la exportación se hace en el frontend)
    exportarCSVCER: (req, res) => {
        res.status(501).json({ success: false, error: 'Exportación CSV se realiza en el frontend' });
    },
    exportarCSVTAMAR: (req, res) => {
        res.status(501).json({ success: false, error: 'Exportación CSV se realiza en el frontend' });
    },
    exportarCSVBADLAR: (req, res) => {
        res.status(501).json({ success: false, error: 'Exportación CSV se realiza en el frontend' });
    },
    exportarCSVFeriados: (req, res) => {
        res.status(501).json({ success: false, error: 'Exportación CSV se realiza en el frontend' });
    }
};

module.exports = calculadoraController;
