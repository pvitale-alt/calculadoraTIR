/**
 * Funciones para guardar y cargar calculadoras desde la base de datos
 */

const CALCULADORAS_CACHE_MS = 30000;
let calculadorasListaCache = null;
let calculadorasListaCacheTime = 0;
const calculadorasDetalleCache = new Map();

/**
 * Recopilar todos los datos de la calculadora del formulario
 */
function recopilarDatosCalculadora() {
    return {
        // Datos Partida
        fechaCompra: document.getElementById('fechaCompra')?.value || '',
        precioCompra: document.getElementById('precioCompra')?.value || '',
        cantidadPartida: document.getElementById('cantidadPartida')?.value || '',
        
        // Datos Especie
        ticker: document.getElementById('ticker')?.value || '',
        tasa: document.getElementById('tasa')?.value || '',
        formula: document.getElementById('formula')?.value || '',
        rentaTNA: document.getElementById('rentaTNA')?.value || '',
        spread: document.getElementById('spread')?.value || '',
        tipoInteresDias: document.getElementById('tipoInteresDias')?.value || '0',
        fechaEmision: document.getElementById('fechaEmision')?.value || '',
        fechaPrimeraRenta: document.getElementById('fechaPrimeraRenta')?.value || '',
        diasRestarFechaFinDev: document.getElementById('diasRestarFechaFinDev')?.value || '-1',
        fechaAmortizacion: document.getElementById('fechaAmortizacion')?.value || '',
        porcentajeAmortizacion: document.getElementById('porcentajeAmortizacion')?.value || '',
        periodicidad: document.getElementById('periodicidad')?.value || '',
        intervaloInicio: document.getElementById('intervaloInicio')?.value || '',
        intervaloFin: document.getElementById('intervaloFin')?.value || '',
        ajusteCER: document.getElementById('ajusteCER')?.checked || false
    };
}

/**
 * Guardar calculadora en la base de datos
 */
async function guardarCalculadora() {
    try {
        const datos = recopilarDatosCalculadora();
        
        // Mostrar modal para ingresar nombre
        mostrarModalGuardarCalculadora(datos);

    } catch (error) {
        console.error('Error al guardar calculadora:', error);
        showError('Error al guardar calculadora: ' + error.message);
    }
}

/**
 * Mostrar modal para ingresar nombre al guardar
 */
function mostrarModalGuardarCalculadora(datos) {
    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'modalGuardarCalculadora';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'card';
    modalContent.style.cssText = `
        max-width: 500px;
        width: 90%;
    `;

    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
            <h2 style="font-size: 20px; font-weight: 500; margin: 0;">Guardar Calculadora</h2>
            <button onclick="cerrarModalGuardarCalculadora()" style="background: none; border: none; cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.2s;" onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='transparent'">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        </div>
        <div style="margin-bottom: 24px;">
            <label class="form-label" style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;">Nombre de la calculadora</label>
            <input type="text" id="nombreCalculadoraInput" class="input" placeholder="Ej: Calculadora TX26 - Enero 2024" style="width: 100%;" autofocus />
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button class="btn" onclick="cerrarModalGuardarCalculadora()">Cancelar</button>
            <button class="btn btn-primary" onclick="confirmarGuardarCalculadora()">Guardar</button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Guardar datos en el modal para usarlos después
    modal.dataset.datos = JSON.stringify(datos);

    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModalGuardarCalculadora();
        }
    });

    // Guardar al presionar Enter
    const input = modalContent.querySelector('#nombreCalculadoraInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmarGuardarCalculadora();
            }
        });
        input.focus();
    }
}

/**
 * Cerrar modal de guardar calculadora
 */
function cerrarModalGuardarCalculadora() {
    const modal = document.getElementById('modalGuardarCalculadora');
    if (modal) {
        modal.remove();
    }
}

/**
 * Confirmar y guardar calculadora
 */
async function confirmarGuardarCalculadora() {
    try {
        const modal = document.getElementById('modalGuardarCalculadora');
        if (!modal) return;

        const nombreInput = document.getElementById('nombreCalculadoraInput');
        const nombre = nombreInput?.value?.trim();

        if (!nombre || nombre === '') {
            showError('Por favor ingrese un nombre para la calculadora');
            return;
        }

        // Obtener datos guardados en el modal
        const datos = JSON.parse(modal.dataset.datos || '{}');

        // Preparar datos para enviar
        const datosEnvio = {
            nombre: nombre,
            ...datos
        };

        const response = await fetch('/api/calculadoras/guardar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosEnvio)
        });

        const result = await response.json();

        if (result.success) {
            cerrarModalGuardarCalculadora();
            showSuccess('Calculadora guardada exitosamente');
            calculadorasListaCache = null;
            calculadorasDetalleCache.clear();
        } else {
            showError(result.error || 'Error al guardar calculadora');
        }

    } catch (error) {
        console.error('Error al confirmar guardar calculadora:', error);
        showError('Error al guardar calculadora: ' + error.message);
    }
}

/**
 * Cargar lista de calculadoras guardadas
 */
async function cargarCalculadora() {
    try {
        const ahora = Date.now();
        if (calculadorasListaCache && (ahora - calculadorasListaCacheTime) < CALCULADORAS_CACHE_MS) {
            mostrarModalCalculadoras(calculadorasListaCache);
            return;
        }
        
        // Obtener lista de calculadoras
        const response = await fetch('/api/calculadoras');

        if (!response.ok) {
            throw new Error('Error al obtener calculadoras');
        }

        const result = await response.json();

        if (!result.success) {
            showError(result.error || 'Error al obtener calculadoras');
            return;
        }

        if (!result.calculadoras || result.calculadoras.length === 0) {
            showError('No hay calculadoras guardadas');
            return;
        }
        
        calculadorasListaCache = result.calculadoras;
        calculadorasListaCacheTime = Date.now();

        // Mostrar modal con lista de calculadoras
        mostrarModalCalculadoras(result.calculadoras);

    } catch (error) {
        console.error('Error al cargar calculadoras:', error);
        showError('Error al cargar calculadoras: ' + error.message);
    }
}

/**
 * Mostrar modal con lista de calculadoras
 */
function mostrarModalCalculadoras(calculadoras) {
    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'modalCalculadoras';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'card';
    modalContent.style.cssText = `
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    `;

    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
            <h2 style="font-size: 20px; font-weight: 500; margin: 0;">Cargar Calculadora</h2>
            <button onclick="cerrarModalCalculadoras()" style="background: none; border: none; cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.2s;" onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='transparent'">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        </div>
        <div id="listaCalculadoras" style="min-height: 200px;">
            ${calculadoras.map(calc => `
                <div style="padding: 16px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;" 
                     onmouseover="this.style.background='#f1f3f4'" 
                     onmouseout="this.style.background='white'"
                     onclick="seleccionarCalculadora(${calc.id})">
                    <div style="font-weight: 500; margin-bottom: 4px;">${calc.nombre}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        Creada: ${new Date(calc.fecha_creacion).toLocaleString('es-AR')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModalCalculadoras();
        }
    });
}

/**
 * Cerrar modal de calculadoras
 */
function cerrarModalCalculadoras() {
    const modal = document.getElementById('modalCalculadoras');
    if (modal) {
        modal.remove();
    }
}

/**
 * Seleccionar y cargar una calculadora
 */
async function seleccionarCalculadora(id) {
    try {
        const cache = calculadorasDetalleCache.get(id);
        const ahora = Date.now();
        if (cache && (ahora - cache.time) < CALCULADORAS_CACHE_MS) {
            aplicarCalculadoraEnFormulario(cache.data);
            cerrarModalCalculadoras();
            showSuccess('Calculadora cargada exitosamente');
            return;
        }
        
        const response = await fetch(`/api/calculadoras/${id}`);
        const result = await response.json();

        if (!result.success) {
            showError(result.error || 'Error al cargar calculadora');
            return;
        }

        const calculadora = result.calculadora;
        calculadorasDetalleCache.set(id, { data: calculadora, time: Date.now() });
        
        aplicarCalculadoraEnFormulario(calculadora);
        cerrarModalCalculadoras();
        showSuccess('Calculadora cargada exitosamente');

    } catch (error) {
        console.error('Error al seleccionar calculadora:', error);
        showError('Error al cargar calculadora: ' + error.message);
    }
}

function aplicarCalculadoraEnFormulario(calculadora = {}) {
    const asignarValor = (id, valor) => {
        const elemento = document.getElementById(id);
        if (!elemento) return;
        if (elemento.type === 'checkbox') {
            elemento.checked = Boolean(valor);
        } else {
            elemento.value = valor ?? '';
        }
    };
    
    asignarValor('fechaCompra', calculadora.fechaCompra);
    asignarValor('precioCompra', calculadora.precioCompra);
    asignarValor('cantidadPartida', calculadora.cantidadPartida);
    asignarValor('ticker', calculadora.ticker);
    asignarValor('tasa', calculadora.tasa);
    asignarValor('formula', calculadora.formula);
    asignarValor('rentaTNA', calculadora.rentaTNA);
    asignarValor('spread', calculadora.spread);
    asignarValor('tipoInteresDias', calculadora.tipoInteresDias);
    asignarValor('fechaEmision', calculadora.fechaEmision);
    asignarValor('fechaPrimeraRenta', calculadora.fechaPrimeraRenta);
    asignarValor('diasRestarFechaFinDev', calculadora.diasRestarFechaFinDev);
    asignarValor('fechaAmortizacion', calculadora.fechaAmortizacion);
    asignarValor('porcentajeAmortizacion', calculadora.porcentajeAmortizacion);
    asignarValor('periodicidad', calculadora.periodicidad);
    asignarValor('intervaloInicio', calculadora.intervaloInicio);
    asignarValor('intervaloFin', calculadora.intervaloFin);
    
    const ajusteCerInput = document.getElementById('ajusteCER');
    if (ajusteCerInput) {
        ajusteCerInput.checked = Boolean(calculadora.ajusteCER);
    }
}

// Funciones relacionadas con CER movidas a calculadora/calculadoraCER.js
// Se mantienen referencias globales para compatibilidad

// Inicializar máscaras de fecha para la página de calculadora
document.addEventListener('DOMContentLoaded', () => {
    // Aplicar máscara a todos los inputs de fecha en la calculadora
    const fechaInputs = [
        'fechaCompra',
        'fechaEmision',
        'fechaPrimeraRenta',
        'fechaAmortizacion',
        'fechaValuacion'
    ];
    
    fechaInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            // Usar separador / para inputs de calculadora
            aplicarMascaraFecha(input, '/');
        }
    });
    
    // Aplicar máscara DD/MM para fechaPrimeraRenta
    const fechaPrimeraRentaInput = document.getElementById('fechaPrimeraRenta');
    if (fechaPrimeraRentaInput) {
        aplicarMascaraFechaDDMM(fechaPrimeraRentaInput);
    }
    
    // Autocompletar fecha valuación con la fecha de hoy
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    if (fechaValuacionInput && !fechaValuacionInput.value) {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const año = hoy.getFullYear();
        fechaValuacionInput.value = `${dia}/${mes}/${año}`;
        
        // Actualizar CER de valuación y coeficientes
        setTimeout(async () => {
            if (window.actualizarCERValuacion) {
                await window.actualizarCERValuacion();
            } else {
                console.warn('[calculadoraStorage] actualizarCERValuacion no está disponible');
            }
            if (window.actualizarCoeficientesCER) {
                await window.actualizarCoeficientesCER();
            } else {
                console.warn('[calculadoraStorage] actualizarCoeficientesCER no está disponible');
            }
            if (window.actualizarVisibilidadCoeficientesCER) {
                window.actualizarVisibilidadCoeficientesCER();
            }
        }, 200);
    } else if (fechaValuacionInput && fechaValuacionInput.value) {
        // Si ya hay una fecha valuación, actualizar coeficientes
        setTimeout(async () => {
            if (window.actualizarCoeficientesCER) {
                await window.actualizarCoeficientesCER();
            }
            if (window.actualizarVisibilidadCoeficientesCER) {
                window.actualizarVisibilidadCoeficientesCER();
            }
        }, 200);
    }
    
    // Listener para fecha valuación: actualizar CER y refrescar estilo de tabla
    if (fechaValuacionInput) {
        // Guardar el valor anterior para detectar cambios
        let valorAnterior = fechaValuacionInput.value;
        let timeoutId = null;
        
        // Función para actualizar CER y refrescar tabla con los nuevos valores
        const actualizarYRefrescar = async () => {
            console.log('[calculadoraStorage] actualizarYRefrescar - Iniciando actualización');
            if (window.actualizarCERValuacion) {
                await window.actualizarCERValuacion();
            } else {
                console.warn('[calculadoraStorage] actualizarCERValuacion no está disponible');
            }
            if (window.actualizarCoeficientesCER) {
                await window.actualizarCoeficientesCER();
            } else {
                console.warn('[calculadoraStorage] actualizarCoeficientesCER no está disponible');
            }
            if (window.refrescarTablaCupones) {
                await window.refrescarTablaCupones();
            } else {
                console.warn('[calculadoraStorage] refrescarTablaCupones no está disponible');
            }
            
            // Recalcular factores de actualización y pagos actualizados después de cambiar fecha valuación
            if (window.cuponesCalculos && window.cuponesCalculos.recalcularValoresDerivados && window.cuponesModule && window.cuponesModule.getCuponesData) {
                const cupones = window.cuponesModule.getCuponesData();
                if (cupones && cupones.length > 0) {
                    window.cuponesCalculos.recalcularValoresDerivados(cupones);
                }
            }
            
            if (window.actualizarVisibilidadCoeficientesCER) {
                window.actualizarVisibilidadCoeficientesCER();
            }
        };
        
        // Listener para eventos de cambio (solo cuando el valor realmente cambia)
        const manejarCambio = async () => {
            const valorActual = fechaValuacionInput.value;
            if (valorActual !== valorAnterior && valorActual.length === 10) { // Solo si está completo (DD/MM/AAAA)
                valorAnterior = valorActual;
                await actualizarYRefrescar();
            }
        };
        
        // Listener para change (cuando se completa la fecha)
        fechaValuacionInput.addEventListener('change', manejarCambio);
        
        // Listener para blur (cuando pierde el foco)
        fechaValuacionInput.addEventListener('blur', manejarCambio);
        
        // Listener para input (con debounce para evitar múltiples llamadas)
        fechaValuacionInput.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                manejarCambio();
            }, 500); // Esperar 500ms después de que el usuario deje de escribir
        });
    }
    
    // Listener para intervaloFin: actualizar CER de valuación y coeficientes
    const intervaloFinInput = document.getElementById('intervaloFin');
    if (intervaloFinInput) {
        const actualizarIntervaloFin = async () => {
            if (window.actualizarCERValuacion) {
                await window.actualizarCERValuacion();
            }
            if (window.actualizarCoeficientesCER) {
                await window.actualizarCoeficientesCER();
            }
        };
        intervaloFinInput.addEventListener('change', actualizarIntervaloFin);
        intervaloFinInput.addEventListener('input', actualizarIntervaloFin);
    }
    
    // Listener para fechaEmision: actualizar coeficiente CER Emisión
    const fechaEmisionInput = document.getElementById('fechaEmision');
    if (fechaEmisionInput) {
        let valorAnteriorEmision = fechaEmisionInput.value;
        const manejarCambioEmision = async () => {
            const valorActual = fechaEmisionInput.value;
            if (valorActual !== valorAnteriorEmision && valorActual.length === 10) {
                valorAnteriorEmision = valorActual;
                await window.actualizarCoeficientesCER();
            }
        };
        fechaEmisionInput.addEventListener('change', manejarCambioEmision);
        fechaEmisionInput.addEventListener('blur', manejarCambioEmision);
    }
    
    // Listener para fechaCompra: actualizar coeficiente CER Compra
    const fechaCompraInput = document.getElementById('fechaCompra');
    if (fechaCompraInput) {
        let valorAnteriorCompra = fechaCompraInput.value;
        const manejarCambioCompra = async () => {
            const valorActual = fechaCompraInput.value;
            if (valorActual !== valorAnteriorCompra && valorActual.length === 10) {
                valorAnteriorCompra = valorActual;
                await window.actualizarCoeficientesCER();
                if (window.tirModule && typeof window.tirModule.resetTIR === 'function') {
                    window.tirModule.resetTIR();
                }
            }
        };
        fechaCompraInput.addEventListener('change', manejarCambioCompra);
        fechaCompraInput.addEventListener('blur', manejarCambioCompra);
    }
    
    const reaplicarValoresFinancierosCupones = () => {
        if (!window.cuponesModule || !window.cuponesModule.getCuponesData) {
            return;
        }
        const cupones = window.cuponesModule.getCuponesData();
        if (!cupones || cupones.length === 0) {
            return;
        }
        if (window.cuponesCalculos && window.cuponesCalculos.aplicarValoresFinancieros) {
            window.cuponesCalculos.aplicarValoresFinancieros(cupones, {
                rentaTNA: document.getElementById('rentaTNA')?.value,
                porcentajeAmortizacion: document.getElementById('porcentajeAmortizacion')?.value,
                forceRender: true
            });
        }
    };
    
    const rentaTNAInput = document.getElementById('rentaTNA');
    const porcentajeAmortizacionInput = document.getElementById('porcentajeAmortizacion');
    let timeoutValoresFinancieros = null;
    
    const programarActualizacionValoresFinancieros = () => {
        clearTimeout(timeoutValoresFinancieros);
        timeoutValoresFinancieros = setTimeout(reaplicarValoresFinancierosCupones, 400);
    };
    
    if (rentaTNAInput) {
        rentaTNAInput.addEventListener('change', reaplicarValoresFinancierosCupones);
        rentaTNAInput.addEventListener('blur', reaplicarValoresFinancierosCupones);
        rentaTNAInput.addEventListener('input', programarActualizacionValoresFinancieros);
    }
    
    if (porcentajeAmortizacionInput) {
        porcentajeAmortizacionInput.addEventListener('change', reaplicarValoresFinancierosCupones);
        porcentajeAmortizacionInput.addEventListener('blur', reaplicarValoresFinancierosCupones);
        porcentajeAmortizacionInput.addEventListener('input', programarActualizacionValoresFinancieros);
    }

    const ejecutarRecalculoFlujos = () => {
        if (!window.cuponesCalculos || typeof window.cuponesCalculos.recalcularFlujos !== 'function') {
            return;
        }
        window.cuponesCalculos.recalcularFlujos(window.cuponesModule?.getCuponesData?.() || []);
    };

    let timeoutRecalculoFlujos = null;
    const programarRecalculoFlujos = () => {
        clearTimeout(timeoutRecalculoFlujos);
        timeoutRecalculoFlujos = setTimeout(ejecutarRecalculoFlujos, 400);
    };

    ['precioCompra', 'cantidadPartida'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', programarRecalculoFlujos);
            input.addEventListener('change', ejecutarRecalculoFlujos);
            input.addEventListener('blur', ejecutarRecalculoFlujos);
        }
    });
    
    // Listener para tipoInteresDias: recalcular todos los dayCountFactor y factores de actualización
    const tipoInteresDiasSelect = document.getElementById('tipoInteresDias');
    if (tipoInteresDiasSelect) {
        tipoInteresDiasSelect.addEventListener('change', () => {
            // Recalcular dayCountFactor para todos los cupones
            const cuponesData = window.cuponesModule?.getCuponesData() || [];
            cuponesData.forEach(cupon => {
                if (cupon.id !== 'inversion') { // Solo cupones normales, no la fila de inversión
                    if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularDayCountFactor) {
                        window.cuponesRecalculos.recalcularDayCountFactor(cupon);
                    }
                }
            });
            
            // Recalcular factores de actualización y pagos actualizados
            if (window.cuponesCalculos && window.cuponesCalculos.recalcularValoresDerivados) {
                window.cuponesCalculos.recalcularValoresDerivados(cuponesData);
            }
        });
    }
    
    // Listener para ajusteCER: actualizar visibilidad de coeficientes
    const ajusteCERCheckbox = document.getElementById('ajusteCER');
    if (ajusteCERCheckbox) {
        ajusteCERCheckbox.addEventListener('change', async () => {
            if (window.actualizarVisibilidadCoeficientesCER) {
                window.actualizarVisibilidadCoeficientesCER();
            }
            // Si se activa y hay cupones, actualizar los coeficientes
            if (ajusteCERCheckbox.checked && window.actualizarCoeficientesCER) {
                await window.actualizarCoeficientesCER();
            }
        });
    }
    
    // Inicializar visibilidad de coeficientes
    setTimeout(() => {
        if (window.actualizarVisibilidadCoeficientesCER) {
            window.actualizarVisibilidadCoeficientesCER();
        }
    }, 300);
});

