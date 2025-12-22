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

// Exportar función globalmente para acceso desde HTML
window.guardarCalculadora = guardarCalculadora;

/**
 * Mostrar modal para ingresar nombre al guardar
 */
async function mostrarModalGuardarCalculadora(datos) {
    // Obtener calculadoras existentes
    let calculadoras = [];
    try {
        const response = await fetch('/api/calculadoras');
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.calculadoras) {
                calculadoras = result.calculadoras;
            }
        }
    } catch (error) {
        console.error('Error al obtener calculadoras:', error);
    }

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
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    `;

    const nombresExistentes = calculadoras.map(c => c.nombre.toLowerCase().trim());

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
            <div id="mensajeValidacion" style="margin-top: 8px; font-size: 12px; color: #d93025; display: none;"></div>
        </div>
        ${calculadoras.length > 0 ? `
        <div style="margin-bottom: 24px;">
            <label class="form-label" style="display: block; margin-bottom: 12px; font-size: 14px; font-weight: 500;">O seleccione una calculadora existente para sobreescribir:</label>
            <div id="listaCalculadorasGuardar" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px;">
                ${calculadoras.map(calc => `
                    <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;" 
                         onmouseover="this.style.background='#f1f3f4'" 
                         onmouseout="this.style.background='white'"
                         onclick="seleccionarCalculadoraParaSobreescribir(${calc.id}, '${calc.nombre.replace(/'/g, "\\'")}')"
                         data-calc-id="${calc.id}">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; margin-bottom: 4px;">${calc.nombre}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                Creada: ${new Date(calc.fecha_creacion).toLocaleString('es-AR')}
                            </div>
                        </div>
                        <button onclick="event.stopPropagation(); eliminarCalculadoraDesdeModal(${calc.id}, '${calc.nombre.replace(/'/g, "\\'")}')" 
                                style="background: none; border: none; cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.2s; color: #d93025; margin-left: 12px;" 
                                onmouseover="this.style.background='#fce8e6'" 
                                onmouseout="this.style.background='transparent'"
                                title="Eliminar calculadora">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button class="btn" onclick="cerrarModalGuardarCalculadora()">Cancelar</button>
            <button class="btn btn-primary" id="btnConfirmarGuardar" onclick="confirmarGuardarCalculadora()">Guardar</button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Guardar datos en el modal para usarlos después
    modal.dataset.datos = JSON.stringify(datos);
    modal.dataset.calculadoras = JSON.stringify(calculadoras);

    // Validar nombre en tiempo real
    const input = modalContent.querySelector('#nombreCalculadoraInput');
    const mensajeValidacion = modalContent.querySelector('#mensajeValidacion');
    const btnConfirmar = modalContent.querySelector('#btnConfirmarGuardar');
    
    // Guardar ID de calculadora seleccionada en el modal
    modal.dataset.calculadoraSeleccionadaId = '';

    if (input) {
        input.addEventListener('input', () => {
            const nombre = input.value.trim();
            modal.dataset.calculadoraSeleccionadaId = '';
            
            // Limpiar selección visual
            modalContent.querySelectorAll('#listaCalculadorasGuardar > div').forEach(div => {
                div.style.background = 'white';
                div.style.borderLeft = 'none';
            });

            if (nombre === '') {
                mensajeValidacion.style.display = 'none';
                btnConfirmar.disabled = false;
                return;
            }

            const nombreLower = nombre.toLowerCase();
            const existe = nombresExistentes.includes(nombreLower);

            if (existe) {
                mensajeValidacion.textContent = 'Ya existe una calculadora con este nombre. Selecciónela para sobreescribir.';
                mensajeValidacion.style.display = 'block';
                mensajeValidacion.style.color = '#f9ab00';
                btnConfirmar.disabled = true;
            } else {
                mensajeValidacion.style.display = 'none';
                btnConfirmar.disabled = false;
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !btnConfirmar.disabled) {
                confirmarGuardarCalculadora();
            }
        });
        input.focus();
    }

    // Función para seleccionar calculadora para sobreescribir
    window.seleccionarCalculadoraParaSobreescribir = (id, nombre) => {
        modal.dataset.calculadoraSeleccionadaId = id.toString();
        input.value = nombre;
        
        // Resaltar la calculadora seleccionada
        modalContent.querySelectorAll('#listaCalculadorasGuardar > div').forEach(div => {
            if (parseInt(div.dataset.calcId) === id) {
                div.style.background = '#e8f0fe';
                div.style.borderLeft = '3px solid var(--primary-color)';
            } else {
                div.style.background = 'white';
                div.style.borderLeft = 'none';
            }
        });

        mensajeValidacion.textContent = 'Se sobreescribirá esta calculadora al guardar.';
        mensajeValidacion.style.display = 'block';
        mensajeValidacion.style.color = '#1e8e3e';
        btnConfirmar.disabled = false;
    };

    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModalGuardarCalculadora();
        }
    });
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
        const calculadoras = JSON.parse(modal.dataset.calculadoras || '[]');

        // Verificar si se seleccionó una calculadora para sobreescribir
        const calculadoraSeleccionadaId = modal.dataset.calculadoraSeleccionadaId;
        const calculadoraSeleccionada = calculadoraSeleccionadaId ? parseInt(calculadoraSeleccionadaId) : null;
        const nombresExistentes = calculadoras.map(c => c.nombre.toLowerCase().trim());
        const nombreLower = nombre.toLowerCase();

        // Si el nombre existe y no se seleccionó una calculadora específica, mostrar error
        if (nombresExistentes.includes(nombreLower) && !calculadoraSeleccionada) {
            showError('Ya existe una calculadora con este nombre. Por favor selecciónela de la lista para sobreescribir.');
            return;
        }

        let response;
        let result;

        if (calculadoraSeleccionada) {
            // Actualizar calculadora existente
            const datosEnvio = {
                nombre: nombre,
                ...datos
            };

            response = await fetch(`/api/calculadoras/${calculadoraSeleccionada}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosEnvio)
            });

            result = await response.json();

            if (result.success) {
                cerrarModalGuardarCalculadora();
                showSuccess('Calculadora actualizada exitosamente');
                calculadorasListaCache = null;
                calculadorasDetalleCache.clear();
            } else {
                showError(result.error || 'Error al actualizar calculadora');
            }
        } else {
            // Crear nueva calculadora
            const datosEnvio = {
                nombre: nombre,
                ...datos
            };

            response = await fetch('/api/calculadoras/guardar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosEnvio)
            });

            result = await response.json();

            if (result.success) {
                cerrarModalGuardarCalculadora();
                showSuccess('Calculadora guardada exitosamente');
                calculadorasListaCache = null;
                calculadorasDetalleCache.clear();
            } else {
                showError(result.error || 'Error al guardar calculadora');
            }
        }

    } catch (error) {
        console.error('Error al confirmar guardar calculadora:', error);
        showError('Error al guardar calculadora: ' + error.message);
    }
}

/**
 * Eliminar calculadora desde el modal
 */
async function eliminarCalculadoraDesdeModal(id, nombre) {
    if (!confirm(`¿Está seguro de que desea eliminar la calculadora "${nombre}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/calculadoras/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Calculadora eliminada exitosamente');
            calculadorasListaCache = null;
            calculadorasDetalleCache.clear();
            
            // Recargar el modal para actualizar la lista
            const modal = document.getElementById('modalGuardarCalculadora');
            if (modal) {
                const datos = JSON.parse(modal.dataset.datos || '{}');
                cerrarModalGuardarCalculadora();
                mostrarModalGuardarCalculadora(datos);
            }
        } else {
            showError(result.error || 'Error al eliminar calculadora');
        }

    } catch (error) {
        console.error('Error al eliminar calculadora:', error);
        showError('Error al eliminar calculadora: ' + error.message);
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

// Exportar función globalmente para acceso desde HTML
window.cargarCalculadora = cargarCalculadora;

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
            // Ocultar tabla de cupones existente al cargar nueva calculadora
            const tablaCuponesContainer = document.getElementById('tablaCuponesContainer');
            if (tablaCuponesContainer) {
                tablaCuponesContainer.style.display = 'none';
                
                // Ocultar panel de resultados
                const panelResultados = document.getElementById('panelResultados');
                if (panelResultados) {
                    panelResultados.style.display = 'none';
                }
            }
            
            // Limpiar cupones existentes
            if (window.cuponesModule && window.cuponesModule.setCuponesData) {
                window.cuponesModule.setCuponesData([]);
            }
            
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
        
        // Ocultar tabla de cupones existente al cargar nueva calculadora
        const tablaCuponesContainer = document.getElementById('tablaCuponesContainer');
        if (tablaCuponesContainer) {
            tablaCuponesContainer.style.display = 'none';
        }
        
        // Ocultar panel de resultados
        const panelResultados = document.getElementById('panelResultados');
        if (panelResultados) {
            panelResultados.style.display = 'none';
        }
        
        // Limpiar cupones existentes
        if (window.cuponesModule && window.cuponesModule.setCuponesData) {
            window.cuponesModule.setCuponesData([]);
        }
        
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
    
    const normalizarDiaPagoValor = (valor) => {
        if (!valor) return '';
        const texto = valor.toString().trim();
        if (/^\d{1,2}$/.test(texto)) {
            return texto;
        }
        if (/^\d{1,2}\/\d{1,2}$/.test(texto)) {
            return texto.split('/')[0];
        }
        return texto;
    };
    
    asignarValor('fechaPrimeraRenta', normalizarDiaPagoValor(calculadora.fechaPrimeraRenta));
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
    
    // Actualizar estado de rentaTNA según el valor de tasa
    const tasaSelect = document.getElementById('tasa');
    const rentaTNAInput = document.getElementById('rentaTNA');
    if (tasaSelect && rentaTNAInput) {
        const valorTasa = tasaSelect.value;
        if (valorTasa === 'tasa-fija') {
            rentaTNAInput.disabled = false;
            rentaTNAInput.removeAttribute('readonly');
            rentaTNAInput.style.backgroundColor = 'white';
            rentaTNAInput.style.cursor = 'text';
        } else {
            rentaTNAInput.disabled = true;
            rentaTNAInput.setAttribute('readonly', 'readonly');
            rentaTNAInput.style.backgroundColor = '#f1f3f4';
            rentaTNAInput.style.cursor = 'not-allowed';
        }
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
    
    // Validar día de pago (fechaPrimeraRenta)
    const fechaPrimeraRentaInput = document.getElementById('fechaPrimeraRenta');
    if (fechaPrimeraRentaInput) {
        const sanitizarDiaPago = () => {
            const valor = parseInt(fechaPrimeraRentaInput.value, 10);
            if (isNaN(valor)) {
                fechaPrimeraRentaInput.value = '';
                return;
            }
            const dia = Math.max(1, Math.min(31, valor));
            fechaPrimeraRentaInput.value = dia;
        };
        fechaPrimeraRentaInput.addEventListener('blur', sanitizarDiaPago);
        fechaPrimeraRentaInput.addEventListener('change', sanitizarDiaPago);
    }
    
    // Autocompletar fecha valuación con la fecha de hoy
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    if (fechaValuacionInput && !fechaValuacionInput.value) {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const año = hoy.getFullYear();
        fechaValuacionInput.value = `${dia}/${mes}/${año}`;
        
        // Actualizar CER de valuación y coeficientes (solo si ajuste CER está activado)
        setTimeout(async () => {
            const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
            
            if (ajusteCER) {
                if (window.actualizarCERValuacion) {
                    await window.actualizarCERValuacion();
                }
                if (window.actualizarCoeficientesCER) {
                    await window.actualizarCoeficientesCER();
                }
            }
            
            if (window.actualizarVisibilidadCoeficientesCER) {
                window.actualizarVisibilidadCoeficientesCER();
            }
        }, 200);
    } else if (fechaValuacionInput && fechaValuacionInput.value) {
        // Si ya hay una fecha valuación, actualizar coeficientes (solo si ajuste CER está activado)
        setTimeout(async () => {
            const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
            
            if (ajusteCER && window.actualizarCoeficientesCER) {
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
        
        // Función para actualizar CER y refrescar tabla con los nuevos valores (solo si ajuste CER está activado)
        const actualizarYRefrescar = async () => {
            const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
            
            if (ajusteCER) {
                if (window.actualizarCERValuacion) {
                    await window.actualizarCERValuacion();
                }
                if (window.actualizarCoeficientesCER) {
                    await window.actualizarCoeficientesCER();
                }
            }
            
            if (window.refrescarTablaCupones) {
                await window.refrescarTablaCupones();
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
    
    // Listener para intervaloFin: actualizar CER de valuación y coeficientes (solo si ajuste CER está activado)
    const intervaloFinInput = document.getElementById('intervaloFin');
    if (intervaloFinInput) {
        const actualizarIntervaloFin = async () => {
            const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
            
            if (ajusteCER) {
                if (window.actualizarCERValuacion) {
                    await window.actualizarCERValuacion();
                }
                if (window.actualizarCoeficientesCER) {
                    await window.actualizarCoeficientesCER();
                }
            }
        };
        intervaloFinInput.addEventListener('change', actualizarIntervaloFin);
        intervaloFinInput.addEventListener('input', actualizarIntervaloFin);
    }
    
    // Listener para fechaEmision: actualizar coeficiente CER Emisión (solo si ajuste CER está activado)
    const fechaEmisionInput = document.getElementById('fechaEmision');
    if (fechaEmisionInput) {
        let valorAnteriorEmision = fechaEmisionInput.value;
        const manejarCambioEmision = async () => {
            const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
            const valorActual = fechaEmisionInput.value;
            if (ajusteCER && valorActual !== valorAnteriorEmision && valorActual.length === 10) {
                valorAnteriorEmision = valorActual;
                if (window.actualizarCoeficientesCER) {
                    await window.actualizarCoeficientesCER();
                }
            }
        };
        fechaEmisionInput.addEventListener('change', manejarCambioEmision);
        fechaEmisionInput.addEventListener('blur', manejarCambioEmision);
    }
    
    // Listener para fechaCompra: actualizar coeficiente CER Compra (solo si ajuste CER está activado)
    const fechaCompraInput = document.getElementById('fechaCompra');
    if (fechaCompraInput) {
        let valorAnteriorCompra = fechaCompraInput.value;
        const manejarCambioCompra = async () => {
            const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
            const valorActual = fechaCompraInput.value;
            if (ajusteCER && valorActual !== valorAnteriorCompra && valorActual.length === 10) {
                valorAnteriorCompra = valorActual;
                if (window.actualizarCoeficientesCER) {
                    await window.actualizarCoeficientesCER();
                }
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
    
    const rentaTNAInputListener = document.getElementById('rentaTNA');
    const porcentajeAmortizacionInput = document.getElementById('porcentajeAmortizacion');
    let timeoutValoresFinancieros = null;
    
    const programarActualizacionValoresFinancieros = () => {
        clearTimeout(timeoutValoresFinancieros);
        timeoutValoresFinancieros = setTimeout(reaplicarValoresFinancierosCupones, 400);
    };
    
    if (rentaTNAInputListener) {
        rentaTNAInputListener.addEventListener('change', reaplicarValoresFinancierosCupones);
        rentaTNAInputListener.addEventListener('blur', reaplicarValoresFinancierosCupones);
        rentaTNAInputListener.addEventListener('input', programarActualizacionValoresFinancieros);
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
    
    // Listener para ajusteCER: actualizar visibilidad de coeficientes y recargar tabla
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
            // Recargar tabla para mostrar/ocultar columnas
            if (window.cuponesModule && typeof window.cuponesModule.renderizarCupones === 'function') {
                window.cuponesModule.renderizarCupones();
            }
        });
    }
    
    // Listener para spread: recalcular Renta TNA cuando no hay ajuste CER
    const spreadInput = document.getElementById('spread');
    if (spreadInput) {
        const recalcularRentaTNAConSpread = async () => {
            const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
            if (!ajusteCER && window.cuponesModule && window.cuponesModule.getCuponesData) {
                const cupones = window.cuponesModule.getCuponesData();
                const spread = parseFloat(spreadInput.value) || 0;
                
                for (const cupon of cupones) {
                    if (cupon.id !== 'inversion' && cupon.promedioTasa) {
                        const promedio = parseFloat(cupon.promedioTasa) || 0;
                        const rentaTNA = promedio + spread;
                        
                        // Actualizar el cupón y el input
                        cupon.rentaTNA = rentaTNA.toFixed(4);
                        const rentaTNAInput = document.getElementById(`rentaTNA_${cupon.id}`);
                        if (rentaTNAInput) {
                            rentaTNAInput.value = rentaTNA.toFixed(4);
                        }
                    }
                }
                
                // Recalcular valores derivados
                if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularValoresDerivados === 'function') {
                    window.cuponesCalculos.recalcularValoresDerivados(cupones);
                }
                
                // Recalcular flujos
                if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularFlujos === 'function') {
                    window.cuponesCalculos.recalcularFlujos(cupones);
                }
            }
        };
        
        spreadInput.addEventListener('change', recalcularRentaTNAConSpread);
        spreadInput.addEventListener('input', recalcularRentaTNAConSpread);
    }
    
    // Listener para diasRestarFechaFinDev: recalcular fechaFinDev de todos los cupones
    const diasRestarFechaFinDevInput = document.getElementById('diasRestarFechaFinDev');
    if (diasRestarFechaFinDevInput) {
        const recalcularFechasFinDev = async () => {
            if (window.cuponesModule && window.cuponesModule.getCuponesData && window.cuponesRecalculos && window.cuponesRecalculos.recalcularFechaFinDev) {
                const cupones = window.cuponesModule.getCuponesData();
                for (const cupon of cupones) {
                    if (cupon.id !== 'inversion' && cupon.fechaLiquid) {
                        await window.cuponesRecalculos.recalcularFechaFinDev(cupon);
                    }
                }
                // Recalcular valores derivados después de actualizar todas las fechasFinDev
                if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularValoresDerivados === 'function') {
                    window.cuponesCalculos.recalcularValoresDerivados(cupones);
                }
            }
        };
        
        diasRestarFechaFinDevInput.addEventListener('change', recalcularFechasFinDev);
        diasRestarFechaFinDevInput.addEventListener('input', recalcularFechasFinDev);
    }
    
    // Inicializar visibilidad de coeficientes
    setTimeout(() => {
        if (window.actualizarVisibilidadCoeficientesCER) {
            window.actualizarVisibilidadCoeficientesCER();
        }
    }, 300);
    
    // Listener para el select de tasa: habilitar/deshabilitar rentaTNA
    const tasaSelect = document.getElementById('tasa');
    const rentaTNAInputTasa = document.getElementById('rentaTNA');
    const formulaSelect = document.getElementById('formula');
    // intervaloFinInput ya está declarado arriba (línea 771), no redeclarar
    const cantidadTasasGroup = document.getElementById('cantidadTasasGroup');
    const cantidadTasasInput = document.getElementById('cantidadTasas');
    
    const actualizarEstadoRentaTNA = () => {
        if (!tasaSelect || !rentaTNAInputTasa) {
            return;
        }
        const valorTasa = tasaSelect.value;
        if (valorTasa === 'tasa-fija') {
            rentaTNAInputTasa.disabled = false;
            rentaTNAInputTasa.removeAttribute('readonly');
            rentaTNAInputTasa.style.backgroundColor = 'white';
            rentaTNAInputTasa.style.cursor = 'text';
        } else {
            rentaTNAInputTasa.disabled = true;
            rentaTNAInputTasa.setAttribute('readonly', 'readonly');
            rentaTNAInputTasa.style.backgroundColor = '#f1f3f4';
            rentaTNAInputTasa.style.cursor = 'not-allowed';
            // Limpiar el valor si no es tasa fija
            if (valorTasa !== '') {
                rentaTNAInputTasa.value = '';
            }
        }
    };
    
    // Función para actualizar el estado del campo fórmula y campos relacionados
    const actualizarEstadoFormula = () => {
        if (!tasaSelect || !formulaSelect) {
            return;
        }
        
        const valorTasa = tasaSelect.value;
        const valorFormula = formulaSelect.value;
        
        // Obtener intervaloFinInput si no está disponible (puede estar declarado arriba)
        const intervaloFinInputLocal = intervaloFinInput || document.getElementById('intervaloFin');
        const cantidadTasasGroupLocal = cantidadTasasGroup || document.getElementById('cantidadTasasGroup');
        const cantidadTasasInputLocal = cantidadTasasInput || document.getElementById('cantidadTasas');
        
        // Si la tasa no es "Tasa fija", hacer el campo fórmula obligatorio
        if (valorTasa && valorTasa !== 'tasa-fija' && valorTasa !== '') {
            formulaSelect.required = true;
            formulaSelect.classList.remove('input-opcional');
            formulaSelect.classList.add('input');
            
            // Si no hay fórmula seleccionada, mostrar error visual
            if (!valorFormula) {
                formulaSelect.style.borderColor = '#d93025';
                formulaSelect.style.borderWidth = '2px';
            } else {
                formulaSelect.style.borderColor = '';
                formulaSelect.style.borderWidth = '';
            }
        } else {
            // Si es "Tasa fija" o no hay tasa seleccionada, hacer el campo opcional
            formulaSelect.required = false;
            formulaSelect.classList.remove('input');
            formulaSelect.classList.add('input-opcional');
            formulaSelect.style.borderColor = '';
            formulaSelect.style.borderWidth = '';
            
            // Ocultar campo "Cantidad tasas" y desbloquear intervaloFin
            if (cantidadTasasGroupLocal) {
                cantidadTasasGroupLocal.style.display = 'none';
            }
            if (cantidadTasasInputLocal) {
                cantidadTasasInputLocal.value = '';
                cantidadTasasInputLocal.required = false;
            }
            if (intervaloFinInputLocal) {
                intervaloFinInputLocal.disabled = false;
                intervaloFinInputLocal.readOnly = false;
                intervaloFinInputLocal.style.backgroundColor = '';
                intervaloFinInputLocal.style.cursor = '';
            }
        }
        
        // Si la fórmula es "Promedio N tasas" Y la tasa no es "Tasa fija"
        if (valorFormula === 'promedio-n-tasas' && valorTasa && valorTasa !== 'tasa-fija' && valorTasa !== '') {
            // Mostrar campo "Cantidad tasas"
            if (cantidadTasasGroupLocal) {
                cantidadTasasGroupLocal.style.display = 'block';
            }
            if (cantidadTasasInputLocal) {
                cantidadTasasInputLocal.required = true;
            }
            
            // Bloquear y vaciar intervaloFin
            if (intervaloFinInputLocal) {
                intervaloFinInputLocal.value = '';
                intervaloFinInputLocal.disabled = true;
                intervaloFinInputLocal.readOnly = true;
                intervaloFinInputLocal.style.backgroundColor = '#f1f3f4';
                intervaloFinInputLocal.style.cursor = 'not-allowed';
            }
        } else {
            // Si no es "Promedio N tasas", ocultar campo "Cantidad tasas" y desbloquear intervaloFin
            if (cantidadTasasGroupLocal) {
                cantidadTasasGroupLocal.style.display = 'none';
            }
            if (cantidadTasasInputLocal) {
                cantidadTasasInputLocal.value = '';
                cantidadTasasInputLocal.required = false;
            }
            if (intervaloFinInputLocal) {
                intervaloFinInputLocal.disabled = false;
                intervaloFinInputLocal.readOnly = false;
                intervaloFinInputLocal.style.backgroundColor = '';
                intervaloFinInputLocal.style.cursor = '';
            }
        }
    };
    
    if (tasaSelect && rentaTNAInputTasa) {
        tasaSelect.addEventListener('change', () => {
            actualizarEstadoRentaTNA();
            actualizarEstadoFormula();
        });
        tasaSelect.addEventListener('input', () => {
            actualizarEstadoRentaTNA();
            actualizarEstadoFormula();
        });
        // Inicializar estado al cargar (con un pequeño delay para asegurar que el DOM esté listo)
        setTimeout(() => {
            actualizarEstadoRentaTNA();
            actualizarEstadoFormula();
        }, 100);
    }
    
    if (formulaSelect) {
        formulaSelect.addEventListener('change', () => {
            actualizarEstadoFormula();
        });
        formulaSelect.addEventListener('input', () => {
            actualizarEstadoFormula();
        });
        // Inicializar estado al cargar
        setTimeout(() => {
            actualizarEstadoFormula();
        }, 100);
    }
    
    // También inicializar cuando cambia la tasa (ya está en el listener de tasaSelect)
    // Asegurar que se ejecute al cargar la página
    setTimeout(() => {
        if (tasaSelect && formulaSelect) {
            actualizarEstadoFormula();
        }
    }, 200);
});

/**
 * Actualizar decimales de renta TNA y refrescar tabla
 */
async function actualizarDecimalesRentaTNA() {
    // Recalcular todos los valores de rentaTNA con los nuevos decimales
    if (window.cuponesModule && window.cuponesModule.getCuponesData) {
        const cupones = window.cuponesModule.getCuponesData();
        if (cupones && cupones.length > 0) {
            const decimalesRentaTNA = window.cuponesCalculos && typeof window.cuponesCalculos.obtenerDecimalesRentaTNA === 'function' 
                ? window.cuponesCalculos.obtenerDecimalesRentaTNA() : 4;
            
            // Recalcular valores derivados que incluyen rentaTNA
            if (window.cuponesCalculos && window.cuponesCalculos.recalcularValoresDerivados) {
                window.cuponesCalculos.recalcularValoresDerivados(cupones);
            }
        }
    }
    
    // Refrescar la tabla para mostrar los valores actualizados
    if (window.cuponesModule && typeof window.cuponesModule.renderizarCupones === 'function') {
        window.cuponesModule.renderizarCupones();
    }
}

// Exportar función globalmente para acceso desde HTML
window.actualizarDecimalesRentaTNA = actualizarDecimalesRentaTNA;

