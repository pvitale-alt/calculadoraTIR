// Servicio para consumir API de feriados
const axios = require('axios');

const FERIADOS_API_URL = process.env.FERIADOS_API_URL || 'https://api.argentinadatos.com/v1/feriados';

/**
 * Obtener feriados de un año específico
 */
const obtenerFeriados = async (anio) => {
    try {
        const response = await axios.get(`${FERIADOS_API_URL}/${anio}`);
        const datos = response.data || [];
        
        return datos.map(feriado => {
            if (feriado && typeof feriado === 'object' && feriado.fecha) {
                return {
                    fecha: feriado.fecha,
                    tipo: feriado.tipo || '',
                    nombre: feriado.nombre || ''
                };
            }
            if (typeof feriado === 'string') {
                return { fecha: feriado, tipo: '', nombre: '' };
            }
            return {
                fecha: feriado.fecha || feriado.date || feriado,
                tipo: feriado.tipo || '',
                nombre: feriado.nombre || ''
            };
        });
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.warn(`⚠️ No hay datos de feriados para el año ${anio} (404) - retornando array vacío`);
            return [];
        }
        console.error(`Error al obtener feriados para año ${anio}:`, error.message);
        return [];
    }
};

/**
 * Obtener feriados en un rango de años
 */
const obtenerFeriadosRango = async (fechaDesde, fechaHasta) => {
    try {
        const fechaDesdeDate = new Date(fechaDesde);
        const fechaHastaDate = new Date(fechaHasta);
        
        const fechaMinima = new Date('2020-01-01');
        const fechaInicio = fechaDesdeDate < fechaMinima ? fechaMinima : fechaDesdeDate;
        
        const todosLosFeriados = [];
        let añoActual = fechaInicio.getFullYear();
        const añoFin = fechaHastaDate.getFullYear();
        
        while (añoActual <= añoFin) {
            const feriadosAño = await obtenerFeriados(añoActual);
            if (feriadosAño && feriadosAño.length > 0) {
                todosLosFeriados.push(...feriadosAño);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            añoActual++;
        }
        
        const feriadosFiltrados = todosLosFeriados
            .filter((feriado, index, self) => {
                const fechaFeriado = feriado.fecha;
                if (!fechaFeriado) return false;
                
                const fechaFeriadoDate = new Date(fechaFeriado);
                
                if (fechaFeriadoDate < fechaInicio || fechaFeriadoDate > fechaHastaDate) {
                    return false;
                }
                
                return index === self.findIndex(f => f.fecha === fechaFeriado);
            })
            .map(feriado => ({
                fecha: feriado.fecha,
                tipo: feriado.tipo || '',
                nombre: feriado.nombre || ''
            }));
        
        return feriadosFiltrados;
    } catch (error) {
        console.error('Error al obtener feriados en rango:', error.message);
        throw new Error('No se pudo obtener datos de feriados');
    }
};

module.exports = {
    obtenerFeriados,
    obtenerFeriadosRango
};

