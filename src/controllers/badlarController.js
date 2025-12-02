/**
 * Controlador para operaciones relacionadas con BADLAR
 */

const pool = require('../config/database');

const badlarController = {
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

                    const countResult = await pool.query('SELECT COUNT(*) as total FROM variables WHERE id_variable = 7');
                    total = parseInt(countResult.rows[0].total);

                    const result = await pool.query(
                        'SELECT fecha, valor, id_variable as idVariable FROM variables WHERE id_variable = 7 ORDER BY fecha DESC LIMIT $1 OFFSET $2',
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
                    INSERT INTO variables (fecha, valor, id_variable)
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
                    'SELECT fecha, valor, id_variable as idVariable FROM variables WHERE fecha >= $1 AND fecha <= $2 AND id_variable = 7 ORDER BY fecha ASC',
                    [desde, hasta]
                );
                return res.json({
                    success: true,
                    datos: result.rows
                });
            }

            const result = await pool.query(
                'SELECT fecha, valor, id_variable as idVariable FROM variables WHERE id_variable = 7 ORDER BY fecha DESC'
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
     * Exportar CSV de BADLAR (stub - la exportación se hace en el frontend)
     */
    exportarCSVBADLAR: (req, res) => {
        res.status(501).json({ success: false, error: 'Exportación CSV se realiza en el frontend' });
    }
};

module.exports = badlarController;

