// Rutas API para consumir datos externos
const express = require('express');
const router = express.Router();
const bcraService = require('../services/bcraService');
const feriadosService = require('../services/feriadosService');
const cerController = require('../controllers/cerController');
const tamarController = require('../controllers/tamarController');
const badlarController = require('../controllers/badlarController');
const feriadosController = require('../controllers/feriadosController');
const calculadorasController = require('../controllers/calculadorasController');

// Obtener datos de CER
router.get('/cer', async (req, res) => {
    try {
        const { desde, hasta } = req.query;

        if (!desde || !hasta) {
            return res.status(400).json({
                success: false,
                error: 'Parámetros "desde" y "hasta" son requeridos'
            });
        }

        const datos = await bcraService.obtenerCER(desde, hasta);

        res.json({
            success: true,
            datos
        });
    } catch (error) {
        console.error('Error en API CER:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener datos de TAMAR
router.get('/tamar', async (req, res) => {
    try {
        const { desde, hasta } = req.query;

        if (!desde || !hasta) {
            return res.status(400).json({
                success: false,
                error: 'Parámetros "desde" y "hasta" son requeridos'
            });
        }

        const datos = await bcraService.obtenerTAMAR(desde, hasta);

        res.json({
            success: true,
            datos
        });
    } catch (error) {
        console.error('Error en API TAMAR:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener datos de BADLAR
router.get('/badlar', async (req, res) => {
    try {
        const { desde, hasta } = req.query;

        if (!desde || !hasta) {
            return res.status(400).json({
                success: false,
                error: 'Parámetros "desde" y "hasta" son requeridos'
            });
        }

        const datos = await bcraService.obtenerBADLAR(desde, hasta);

        res.json({
            success: true,
            datos
        });
    } catch (error) {
        console.error('Error en API BADLAR:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener feriados en un rango de fechas (debe ir antes de /feriados/:anio)
router.get('/feriados', async (req, res) => {
    console.log('[API] 🔍 GET /api/feriados - INICIO', {
        query: req.query,
        desde: req.query.desde,
        hasta: req.query.hasta
    });
    
    try {
        const { desde, hasta } = req.query;

        if (!desde || !hasta) {
            console.error('[API] ❌ GET /api/feriados - Parámetros faltantes:', {
                desde: desde || 'FALTANTE',
                hasta: hasta || 'FALTANTE'
            });
            return res.status(400).json({
                success: false,
                error: 'Parámetros "desde" y "hasta" son requeridos'
            });
        }

        console.log('[API] ✅ GET /api/feriados - Parámetros válidos, llamando a obtenerFeriadosRango');
        const datos = await feriadosService.obtenerFeriadosRango(desde, hasta);

        console.log('[API] ✅ GET /api/feriados - FIN: Datos obtenidos:', {
            cantidad: datos ? datos.length : 0
        });

        res.json({
            success: true,
            datos
        });
    } catch (error) {
        console.error('[API] ❌ Error en GET /api/feriados:', {
            message: error.message,
            stack: error.stack,
            desde: req.query.desde,
            hasta: req.query.hasta
        });
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener feriados'
        });
    }
});

// Guardar datos en BD
router.post('/cer/guardar', cerController.guardarCER);
router.post('/tamar/guardar', tamarController.guardarTAMAR);
router.post('/badlar/guardar', badlarController.guardarBADLAR);
router.post('/feriados/guardar', feriadosController.guardarFeriados);
router.post('/feriados/nuevo', feriadosController.guardarFeriadoIndividual);

// Obtener datos desde BD (debe ir ANTES de /feriados/:anio para evitar conflictos)
router.get('/cer/bd', cerController.obtenerCERBD);
router.get('/tamar/bd', tamarController.obtenerTAMARBD);
router.get('/badlar/bd', badlarController.obtenerBADLARBD);
router.get('/feriados/bd', feriadosController.obtenerFeriadosBD);

// Obtener feriados de un año específico (debe ir DESPUÉS de rutas específicas como /bd)
router.get('/feriados/:anio', async (req, res) => {
    const { anio } = req.params;
    console.log('[API] 🔍 GET /api/feriados/:anio - INICIO', {
        anio,
        tipo: typeof anio,
        params: req.params
    });
    
    try {
        const anioNum = parseInt(anio, 10);

        if (!anio || isNaN(anioNum) || anioNum < 2000 || anioNum > 2100) {
            console.error('[API] ❌ GET /api/feriados/:anio - Año inválido:', {
                anio,
                anioNum,
                esNaN: isNaN(anioNum),
                rangoValido: anioNum >= 2000 && anioNum <= 2100
            });
            return res.status(400).json({
                success: false,
                error: `Año inválido: ${anio}. Debe ser un número entre 2000 y 2100.`
            });
        }

        console.log('[API] ✅ GET /api/feriados/:anio - Año válido, llamando a obtenerFeriados');
        const datos = await feriadosService.obtenerFeriados(anioNum);

        console.log('[API] ✅ GET /api/feriados/:anio - FIN: Datos obtenidos:', {
            cantidad: datos ? datos.length : 0
        });

        res.json({
            success: true,
            datos
        });
    } catch (error) {
        console.error('[API] ❌ Error en GET /api/feriados/:anio:', {
            message: error.message,
            stack: error.stack,
            anio,
            errorResponse: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : 'No response'
        });
        
        if (error.response && error.response.status === 404) {
            console.warn('[API] ⚠️ GET /api/feriados/:anio - 404, retornando array vacío');
            return res.json({
                success: true,
                datos: []
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener feriados'
        });
    }
});

// Exportar CSV
router.get('/cer/exportar', cerController.exportarCSVCER);
router.get('/tamar/exportar', tamarController.exportarCSVTAMAR);
router.get('/badlar/exportar', badlarController.exportarCSVBADLAR);
router.get('/feriados/exportar', feriadosController.exportarCSVFeriados);

// Guardar y cargar calculadoras
router.post('/calculadoras/guardar', calculadorasController.guardarCalculadora);
router.put('/calculadoras/:id', calculadorasController.actualizarCalculadora);
router.delete('/calculadoras/:id', calculadorasController.eliminarCalculadora);
router.get('/calculadoras', calculadorasController.obtenerCalculadoras);
router.get('/calculadoras/:id', calculadorasController.cargarCalculadora);

module.exports = router;



