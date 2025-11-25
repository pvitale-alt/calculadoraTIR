// Servicio para consumir API del BCRA v4.0
const axios = require('axios');
const https = require('https');

const BCRA_API_URL = process.env.BCRA_API_URL || 'https://api.bcra.gob.ar/estadisticas/v4.0';

/**
 * Obtener datos de CER desde BCRA
 */
const obtenerCER = async (fechaDesde, fechaHasta) => {
    try {
        const fechaDesdeDate = new Date(fechaDesde);
        const fechaHastaDate = new Date(fechaHasta);
        
        const fechaMinima = new Date('2020-01-01');
        const fechaInicio = fechaDesdeDate < fechaMinima ? fechaMinima : fechaDesdeDate;
        
        const todosLosDatos = [];
        let añoActual = fechaInicio.getFullYear();
        const añoFin = fechaHastaDate.getFullYear();
        
        while (añoActual <= añoFin) {
            let desdeAño = añoActual === fechaInicio.getFullYear() 
                ? fechaDesde
                : `${añoActual}-01-01`;
            
            let hastaAño = añoActual === añoFin
                ? fechaHasta
                : `${añoActual}-12-31`;
            
            try {
                console.log(`[CER] Consultando API para año ${añoActual}: desde=${desdeAño}, hasta=${hastaAño}`);
                const response = await axios.get(`${BCRA_API_URL}/monetarias/30`, {
                    params: {
                        desde: desdeAño,
                        hasta: hastaAño
                    },
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false
                    }),
                    timeout: 15000,
                    validateStatus: function (status) {
                        // No lanzar error para 4xx o 5xx, solo registrar
                        return true;
                    }
                });

                console.log(`[CER] Respuesta recibida para año ${añoActual}: status=${response.status}`);

                // Verificar si la respuesta es exitosa
                if (response.status !== 200) {
                    if (response.status >= 500) {
                        // Error del servidor - puede ser problema temporal de la API o no hay datos
                        console.warn(`[CER] Error del servidor para año ${añoActual} (status: ${response.status}). La API del BCRA puede estar temporalmente no disponible o no hay datos para este período.`);
                        if (response.data && response.data.errorMessages) {
                            console.warn(`[CER] Mensaje de error de la API:`, response.data.errorMessages);
                        }
                    } else if (response.status === 404 || response.status === 400) {
                        console.warn(`[CER] No hay datos de CER disponibles para año ${añoActual} (status: ${response.status})`);
                        if (response.data && response.data.errorMessages) {
                            console.warn(`[CER] Mensaje de error de la API:`, response.data.errorMessages);
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));
                    añoActual++;
                    continue;
                }
                
                // La API v4.0 devuelve: { status: 200, results: [{ idVariable: 30, detalle: [{ fecha: "YYYY-MM-DD", valor: number }] }] }
                const results = response.data?.results || [];
                console.log(`[CER] Resultados recibidos para año ${añoActual}: ${results.length} resultados`);
                
                if (Array.isArray(results) && results.length > 0) {
                    // Extraer datos del array 'detalle' dentro de cada resultado
                    const datos = [];
                    results.forEach(result => {
                        if (result.detalle && Array.isArray(result.detalle)) {
                            datos.push(...result.detalle);
                        }
                    });
                    
                    console.log(`[CER] Total de registros extraídos del detalle para año ${añoActual}: ${datos.length}`);
                    
                    if (datos.length > 0) {
                        const fechaDesdeStr = fechaDesde.split('T')[0];
                        const fechaHastaStr = fechaHasta.split('T')[0];
                        
                        const datosFiltrados = datos.filter(item => {
                            const fechaItem = item.fecha ? item.fecha.split('T')[0] : null;
                            return fechaItem && fechaItem >= fechaDesdeStr && fechaItem <= fechaHastaStr;
                        });
                        
                        console.log(`[CER] Registros filtrados para el rango solicitado: ${datosFiltrados.length}`);
                        
                        const datosNormalizados = datosFiltrados.map(item => ({
                            fecha: item.fecha,
                            valor: item.valor,
                            idVariable: 30
                        }));
                        todosLosDatos.push(...datosNormalizados);
                    } else {
                        console.warn(`[CER] No se encontraron datos en el detalle para año ${añoActual}`);
                    }
                } else {
                    console.warn(`[CER] No se recibieron resultados para año ${añoActual}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                // Si es un error de red o timeout, solo registrar y continuar
                if (error.code === 'ECONNABORTED') {
                    console.warn(`[CER] Timeout al consultar año ${añoActual}: ${error.message}`);
                } else if (error.response?.status >= 500) {
                    console.warn(`[CER] Error del servidor al consultar año ${añoActual} (status: ${error.response.status}): ${error.message}`);
                    if (error.response.data && error.response.data.errorMessages) {
                        console.warn(`[CER] Mensaje de error de la API:`, error.response.data.errorMessages);
                    }
                } else {
                    console.error(`[CER] Error al obtener CER para año ${añoActual}:`, error.message);
                    if (error.response) {
                        console.error(`[CER] Status: ${error.response.status}, Data:`, JSON.stringify(error.response.data));
                    }
                }
            }
            
            añoActual++;
        }

        const datosUnicos = todosLosDatos
            .filter((item, index, self) => 
                index === self.findIndex(t => t.fecha === item.fecha)
            )
            .sort((a, b) => {
                const fechaA = new Date(a.fecha);
                const fechaB = new Date(b.fecha);
                return fechaB - fechaA;
            });

        return datosUnicos;
    } catch (error) {
        console.error('Error al obtener CER desde BCRA:', error.message);
        throw new Error('No se pudo obtener datos de CER');
    }
};

/**
 * Obtener datos de TAMAR desde BCRA
 */
const obtenerTAMAR = async (fechaDesde, fechaHasta) => {
    try {
        const fechaDesdeDate = new Date(fechaDesde);
        const fechaHastaDate = new Date(fechaHasta);
        
        const fechaMinima = new Date('2020-01-01');
        const fechaInicio = fechaDesdeDate < fechaMinima ? fechaMinima : fechaDesdeDate;
        
        const todosLosDatos = [];
        let añoActual = fechaInicio.getFullYear();
        const añoFin = fechaHastaDate.getFullYear();
        
        while (añoActual <= añoFin) {
            let desdeAño = añoActual === fechaInicio.getFullYear() 
                ? fechaDesde
                : `${añoActual}-01-01`;
            
            let hastaAño = añoActual === añoFin
                ? fechaHasta
                : `${añoActual}-12-31`;
            
            try {
                console.log(`[TAMAR] Consultando API para año ${añoActual}: desde=${desdeAño}, hasta=${hastaAño}`);
                const response = await axios.get(`${BCRA_API_URL}/monetarias/44`, {
                    params: {
                        desde: desdeAño,
                        hasta: hastaAño
                    },
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false
                    }),
                    timeout: 15000,
                    validateStatus: function (status) {
                        return true;
                    }
                });

                console.log(`[TAMAR] Respuesta recibida para año ${añoActual}: status=${response.status}`);

                // Verificar si la respuesta es exitosa
                if (response.status !== 200) {
                    if (response.status >= 500) {
                        console.warn(`[TAMAR] Error del servidor para año ${añoActual} (status: ${response.status}). La API del BCRA puede estar temporalmente no disponible o no hay datos para este período.`);
                        if (response.data && response.data.errorMessages) {
                            console.warn(`[TAMAR] Mensaje de error de la API:`, response.data.errorMessages);
                        }
                    } else if (response.status === 404 || response.status === 400) {
                        console.warn(`[TAMAR] No hay datos de TAMAR disponibles para año ${añoActual} (status: ${response.status})`);
                        if (response.data && response.data.errorMessages) {
                            console.warn(`[TAMAR] Mensaje de error de la API:`, response.data.errorMessages);
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));
                    añoActual++;
                    continue;
                }
                
                // La API v4.0 devuelve: { status: 200, results: [{ idVariable: 44, detalle: [{ fecha: "YYYY-MM-DD", valor: number }] }] }
                const results = response.data?.results || [];
                console.log(`[TAMAR] Resultados recibidos para año ${añoActual}: ${results.length} resultados`);
                
                if (Array.isArray(results) && results.length > 0) {
                    // Extraer datos del array 'detalle' dentro de cada resultado
                    const datos = [];
                    results.forEach(result => {
                        if (result.detalle && Array.isArray(result.detalle)) {
                            datos.push(...result.detalle);
                        }
                    });
                    
                    console.log(`[TAMAR] Total de registros extraídos del detalle para año ${añoActual}: ${datos.length}`);
                    
                    if (datos.length > 0) {
                        const fechaDesdeStr = fechaDesde.split('T')[0];
                        const fechaHastaStr = fechaHasta.split('T')[0];
                        
                        const datosFiltrados = datos.filter(item => {
                            const fechaItem = item.fecha ? item.fecha.split('T')[0] : null;
                            return fechaItem && fechaItem >= fechaDesdeStr && fechaItem <= fechaHastaStr;
                        });
                        
                        console.log(`[TAMAR] Registros filtrados para el rango solicitado: ${datosFiltrados.length}`);
                        
                        const datosNormalizados = datosFiltrados.map(item => ({
                            fecha: item.fecha,
                            valor: item.valor,
                            idVariable: 44
                        }));
                        todosLosDatos.push(...datosNormalizados);
                    } else {
                        console.warn(`[TAMAR] No se encontraron datos en el detalle para año ${añoActual}`);
                    }
                } else {
                    console.warn(`[TAMAR] No se recibieron resultados para año ${añoActual}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                if (error.code === 'ECONNABORTED' || error.response?.status >= 500) {
                    console.warn(`No se pudo obtener TAMAR para año ${añoActual}: ${error.message}`);
                } else {
                    console.error(`Error al obtener TAMAR para año ${añoActual}:`, error.message);
                }
            }
            
            añoActual++;
        }

        const datosUnicos = todosLosDatos
            .filter((item, index, self) => 
                index === self.findIndex(t => t.fecha === item.fecha)
            )
            .sort((a, b) => {
                const fechaA = new Date(a.fecha);
                const fechaB = new Date(b.fecha);
                return fechaB - fechaA;
            });

        return datosUnicos;
    } catch (error) {
        console.error('Error al obtener TAMAR desde BCRA:', error.message);
        throw new Error('No se pudo obtener datos de TAMAR');
    }
};

/**
 * Obtener datos de BADLAR desde BCRA
 */
const obtenerBADLAR = async (fechaDesde, fechaHasta) => {
    try {
        const fechaDesdeDate = new Date(fechaDesde);
        const fechaHastaDate = new Date(fechaHasta);
        
        const fechaMinima = new Date('2020-01-01');
        const fechaInicio = fechaDesdeDate < fechaMinima ? fechaMinima : fechaDesdeDate;
        
        const todosLosDatos = [];
        let añoActual = fechaInicio.getFullYear();
        const añoFin = fechaHastaDate.getFullYear();
        
        while (añoActual <= añoFin) {
            let desdeAño = añoActual === fechaInicio.getFullYear() 
                ? fechaDesde
                : `${añoActual}-01-01`;
            
            let hastaAño = añoActual === añoFin
                ? fechaHasta
                : `${añoActual}-12-31`;
            
            try {
                console.log(`[BADLAR] Consultando API para año ${añoActual}: desde=${desdeAño}, hasta=${hastaAño}`);
                const response = await axios.get(`${BCRA_API_URL}/monetarias/7`, {
                    params: {
                        desde: desdeAño,
                        hasta: hastaAño
                    },
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false
                    }),
                    timeout: 15000,
                    validateStatus: function (status) {
                        return true;
                    }
                });

                console.log(`[BADLAR] Respuesta recibida para año ${añoActual}: status=${response.status}`);

                // Verificar si la respuesta es exitosa
                if (response.status !== 200) {
                    if (response.status >= 500) {
                        console.warn(`[BADLAR] Error del servidor para año ${añoActual} (status: ${response.status}). La API del BCRA puede estar temporalmente no disponible o no hay datos para este período.`);
                        if (response.data && response.data.errorMessages) {
                            console.warn(`[BADLAR] Mensaje de error de la API:`, response.data.errorMessages);
                        }
                    } else if (response.status === 404 || response.status === 400) {
                        console.warn(`[BADLAR] No hay datos de BADLAR disponibles para año ${añoActual} (status: ${response.status})`);
                        if (response.data && response.data.errorMessages) {
                            console.warn(`[BADLAR] Mensaje de error de la API:`, response.data.errorMessages);
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));
                    añoActual++;
                    continue;
                }
                
                // La API v4.0 devuelve: { status: 200, results: [{ idVariable: 7, detalle: [{ fecha: "YYYY-MM-DD", valor: number }] }] }
                const results = response.data?.results || [];
                console.log(`[BADLAR] Resultados recibidos para año ${añoActual}: ${results.length} resultados`);
                
                if (Array.isArray(results) && results.length > 0) {
                    // Extraer datos del array 'detalle' dentro de cada resultado
                    const datos = [];
                    results.forEach(result => {
                        if (result.detalle && Array.isArray(result.detalle)) {
                            datos.push(...result.detalle);
                        }
                    });
                    
                    console.log(`[BADLAR] Total de registros extraídos del detalle para año ${añoActual}: ${datos.length}`);
                    
                    if (datos.length > 0) {
                        const fechaDesdeStr = fechaDesde.split('T')[0];
                        const fechaHastaStr = fechaHasta.split('T')[0];
                        
                        const datosFiltrados = datos.filter(item => {
                            const fechaItem = item.fecha ? item.fecha.split('T')[0] : null;
                            return fechaItem && fechaItem >= fechaDesdeStr && fechaItem <= fechaHastaStr;
                        });
                        
                        console.log(`[BADLAR] Registros filtrados para el rango solicitado: ${datosFiltrados.length}`);
                        
                        const datosNormalizados = datosFiltrados.map(item => ({
                            fecha: item.fecha,
                            valor: item.valor,
                            idVariable: 7
                        }));
                        todosLosDatos.push(...datosNormalizados);
                    } else {
                        console.warn(`[BADLAR] No se encontraron datos en el detalle para año ${añoActual}`);
                    }
                } else {
                    console.warn(`[BADLAR] No se recibieron resultados para año ${añoActual}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                if (error.code === 'ECONNABORTED' || error.response?.status >= 500) {
                    console.warn(`No se pudo obtener BADLAR para año ${añoActual}: ${error.message}`);
                } else {
                    console.error(`Error al obtener BADLAR para año ${añoActual}:`, error.message);
                }
            }
            
            añoActual++;
        }

        const datosUnicos = todosLosDatos
            .filter((item, index, self) => 
                index === self.findIndex(t => t.fecha === item.fecha)
            )
            .sort((a, b) => {
                const fechaA = new Date(a.fecha);
                const fechaB = new Date(b.fecha);
                return fechaB - fechaA;
            });

        return datosUnicos;
    } catch (error) {
        console.error('Error al obtener BADLAR desde BCRA:', error.message);
        throw new Error('No se pudo obtener datos de BADLAR');
    }
};

module.exports = {
    obtenerCER,
    obtenerTAMAR,
    obtenerBADLAR
};

