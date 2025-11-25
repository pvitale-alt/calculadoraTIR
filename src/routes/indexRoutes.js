const express = require('express');
const router = express.Router();
const calculadoraController = require('../controllers/calculadoraController');

// Ruta principal - redirige a Calculadora
router.get('/', (req, res) => {
    res.redirect('/calculadora');
});

// Rutas de las 5 solapas
router.get('/calculadora', calculadoraController.renderCalculadora);
router.get('/cer', calculadoraController.renderCER);
router.get('/tamar', calculadoraController.renderTAMAR);
router.get('/badlar', calculadoraController.renderBADLAR);
router.get('/feriados', calculadoraController.renderFeriados);

module.exports = router;

