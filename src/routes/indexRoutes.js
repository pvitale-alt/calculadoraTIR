const express = require('express');
const router = express.Router();
const calculadoraController = require('../controllers/calculadoraController');
const cerController = require('../controllers/cerController');
const tamarController = require('../controllers/tamarController');
const badlarController = require('../controllers/badlarController');
const feriadosController = require('../controllers/feriadosController');
const inventarioController = require('../controllers/inventarioController');

// Ruta principal - redirige a Calculadora
router.get('/', (req, res) => {
    res.redirect('/calculadora');
});

// Rutas de las solapas
router.get('/calculadora', calculadoraController.renderCalculadora);
router.get('/cer', cerController.renderCER);
router.get('/tamar', tamarController.renderTAMAR);
router.get('/badlar', badlarController.renderBADLAR);
router.get('/feriados', feriadosController.renderFeriados);
router.get('/inventario', inventarioController.renderInventario);

module.exports = router;



