/**
 * Core de gestión de cupones
 * Funcionalidades básicas: agregar, eliminar, renderizar
 * 
 * NOTA: Este archivo será extendido con lógica compleja de autocompletado
 */

// Inicializar window.cuponesModule al principio del archivo
// Esto asegura que esté disponible inmediatamente
window.cuponesModule = window.cuponesModule || {};

// Estado de la tabla de cupones
let cuponesData = [];
let cuponCounter = 1;

// Función para restaurar el estado completo al cargar la página
function restaurarEstadoCalculadora() {
    try {
        // Restaurar valores del formulario
        const formState = sessionStorage.getItem('calculadora_formState');
        if (formState) {
            const state = JSON.parse(formState);
            
            // Restaurar cada campo del formulario
            const campos = [
                'ajusteCER', 'tasa', 'spread', 'fechaValuacion', 'fechaCompra', 'precioCompra',
                'cantidadPartida', 'fechaEmision', 'fechaPrimeraRenta', 'fechaAmortizacion',
                'porcentajeAmortizacion', 'periodicidad', 'intervaloInicio', 'intervaloFin',
                'diasRestarFechaFinDev', 'tipoInteresDias', 'rentaTNA', 'decimalesAjustes',
                'decimalesRentaTNA', 'coeficienteCEREmision', 'coeficienteCERCompra', 'cerValuacion'
            ];
            
            campos.forEach(campo => {
                const elemento = document.getElementById(campo);
                if (elemento && state[campo] !== undefined) {
                    if (elemento.type === 'checkbox') {
                        elemento.checked = state[campo];
                    } else {
                        elemento.value = state[campo];
                    }
                }
            });
            
            // Disparar eventos de cambio para actualizar la UI
            const ajusteCEREl = document.getElementById('ajusteCER');
            if (ajusteCEREl) {
                ajusteCEREl.dispatchEvent(new Event('change'));
            }
            
            const tasaEl = document.getElementById('tasa');
            if (tasaEl) {
                tasaEl.dispatchEvent(new Event('change'));
            }
        }
        
        // No restaurar cupones desde sessionStorage - deben cargarse manualmente
    } catch (e) {
        console.warn('[restaurarEstadoCalculadora] Error:', e);
    }
}

// Función para guardar el estado del formulario
function guardarEstadoFormulario() {
    try {
        const campos = [
            'ajusteCER', 'tasa', 'spread', 'fechaValuacion', 'fechaCompra', 'precioCompra',
            'cantidadPartida', 'fechaEmision', 'fechaPrimeraRenta', 'fechaAmortizacion',
            'porcentajeAmortizacion', 'periodicidad', 'intervaloInicio', 'intervaloFin',
            'diasRestarFechaFinDev', 'tipoInteresDias', 'rentaTNA', 'decimalesAjustes',
            'decimalesRentaTNA', 'coeficienteCEREmision', 'coeficienteCERCompra', 'cerValuacion'
        ];
        
        const state = {};
        campos.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) {
                if (elemento.type === 'checkbox') {
                    state[campo] = elemento.checked;
                } else {
                    state[campo] = elemento.value;
                }
            }
        });
        
        sessionStorage.setItem('calculadora_formState', JSON.stringify(state));
    } catch (e) {
        console.warn('[guardarEstadoFormulario] Error:', e);
    }
}

// Ejecutar restauración cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para asegurar que todos los scripts estén cargados
    setTimeout(restaurarEstadoCalculadora, 200);
    
    // Agregar listeners para guardar estado del formulario automáticamente
    setTimeout(() => {
        const camposAEscuchar = [
            'ajusteCER', 'tasa', 'spread', 'fechaValuacion', 'fechaCompra', 'precioCompra',
            'cantidadPartida', 'fechaEmision', 'fechaPrimeraRenta', 'fechaAmortizacion',
            'porcentajeAmortizacion', 'periodicidad', 'intervaloInicio', 'intervaloFin',
            'diasRestarFechaFinDev', 'tipoInteresDias', 'rentaTNA', 'decimalesAjustes',
            'decimalesRentaTNA', 'coeficienteCEREmision', 'coeficienteCERCompra', 'cerValuacion'
        ];
        
        camposAEscuchar.forEach(campoId => {
            const elemento = document.getElementById(campoId);
            if (elemento) {
                elemento.addEventListener('change', guardarEstadoFormulario);
                elemento.addEventListener('input', guardarEstadoFormulario);
            }
        });
    }, 300);
});

// Exportar funciones globalmente
window.guardarEstadoFormulario = guardarEstadoFormulario;
window.restaurarEstadoCalculadora = restaurarEstadoCalculadora;

/**
 * Función para cargar/mostrar la tabla de cupones
 */
function cargarCupones() {
    const container = document.getElementById('tablaCuponesContainer');
    const tbody = document.getElementById('cuponesBody');
    
    if (!container || !tbody) {
        console.error('No se encontraron los elementos de la tabla de cupones');
        return;
    }
    
    // No restaurar desde sessionStorage - los cupones deben cargarse manualmente
    
    // Si la tabla está oculta, mostrarla
    if (container.style.display === 'none') {
        container.style.display = 'block';
        
        // Si no hay cupones, agregar uno inicial
        if (cuponesData.length === 0) {
            agregarFilaCupon();
        } else {
            // Si ya hay cupones, renderizar los existentes
            renderizarCupones();
        }
        
        // Guardar estado del formulario
        guardarEstadoFormulario();
    } else {
        // Si está visible, ocultarla
        container.style.display = 'none';
    }
}

/**
 * Agrega una nueva fila de cupón a la tabla
 */
function agregarFilaCupon() {
    const cuponId = cuponCounter++;
    const nuevoCupon = {
        id: cuponId,
        cupon: cuponId,
        fechaInicio: '',
        fechaFinDev: '',
        fechaLiquid: '',
        inicioIntervalo: '',
        finalIntervalo: '',
        valorCERInicio: '',
        valorCERFinal: '',
        dayCountFactor: '',
        amortiz: '',
        valorResidual: '',
        amortizAjustada: '',
        rentaNominal: '',
        rentaTNA: '',
        rentaAjustada: '',
        factorActualiz: '',
        pagosActualiz: '',
        flujos: '',
        flujosDesc: ''
    };
    
    cuponesData.push(nuevoCupon);
    
    renderizarCupones();
}

/**
 * Elimina una fila de cupón
 */
function eliminarFilaCupon(cuponId) {
    cuponesData = cuponesData.filter(c => c.id !== cuponId);
    
    renderizarCupones();
    
    // Actualizar visibilidad de coeficientes CER
    if (typeof window.actualizarVisibilidadCoeficientesCER === 'function') {
        window.actualizarVisibilidadCoeficientesCER();
    }
}

/**
 * Renderiza todas las filas de cupones en la tabla
 */
async function renderizarCupones() {
    const tbody = document.getElementById('cuponesBody');
    if (!tbody) return;
    
    // No restaurar desde sessionStorage - los cupones deben cargarse manualmente
    
    tbody.innerHTML = '';
    
    // Obtener decimales de ajustes para calcular step
    const decimalesAjustes = (typeof window.obtenerDecimalesAjustes === 'function') ? window.obtenerDecimalesAjustes() : 8;
    const stepRentaNominal = decimalesAjustes === 12 ? '0.000000000001' : decimalesAjustes === 10 ? '0.0000000001' : decimalesAjustes === 8 ? '0.00000001' : '0.0001';
    const stepAmortizAjustada = decimalesAjustes === 12 ? '0.000000000001' : decimalesAjustes === 10 ? '0.0000000001' : decimalesAjustes === 8 ? '0.00000001' : '0.0001';
    
    // Verificar estado de ajusteCER y tipo de tasa
    const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
    const tipoTasa = document.getElementById('tasa')?.value || '';
    // Los valores del select son en minúsculas: 'tamar' o 'badlar'
    const mostrarIconoLupa = !ajusteCER && (tipoTasa.toLowerCase() === 'tamar' || tipoTasa.toLowerCase() === 'badlar');
    
    // Función para convertir fecha de DD/MM/AAAA a DD-MM-AAAA (formato usado en TAMAR/BADLAR)
    const convertirFechaParaTAMAR = (fechaDDMMAAAA) => {
        if (!fechaDDMMAAAA || !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaDDMMAAAA)) {
            return '';
        }
        return fechaDDMMAAAA.replace(/\//g, '-');
    };
    
    // Mostrar/ocultar columnas según ajusteCER
    const columnaCERInicio = document.querySelector('.columna-cer-inicio');
    const columnaCERFinal = document.querySelector('.columna-cer-final');
    const columnaPromedioTasa = document.querySelector('.columna-promedio-tasa');
    
    if (ajusteCER) {
        // Mostrar columnas CER, ocultar promedio tasa
        if (columnaCERInicio) columnaCERInicio.style.display = '';
        if (columnaCERFinal) columnaCERFinal.style.display = '';
        if (columnaPromedioTasa) columnaPromedioTasa.style.display = 'none';
    } else {
        // Ocultar columnas CER, mostrar promedio tasa
        if (columnaCERInicio) columnaCERInicio.style.display = 'none';
        if (columnaCERFinal) columnaCERFinal.style.display = 'none';
        if (columnaPromedioTasa) columnaPromedioTasa.style.display = '';
    }
    
    // Obtener fecha valuación para comparar
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    const fechaValuacionStr = fechaValuacionInput?.value || '';
    let fechaValuacionDate = null;
    
    if (fechaValuacionStr) {
        try {
            fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr));
        } catch (e) {
            console.warn('Error al parsear fecha valuación:', e);
        }
    }
    
    // Identificar el cupón vigente (donde fechaValuacion está entre fechaInicio y fechaFinDev)
    let cuponVigenteId = null;
    let cuponVigente = null;
    if (!ajusteCER && fechaValuacionDate) {
        for (const cupon of cuponesData) {
            if (cupon.id === 'inversion') continue;
            if (!cupon.fechaInicio || !cupon.fechaFinDev) continue;
            
            try {
                const fechaInicioDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(cupon.fechaInicio));
                const fechaFinDevDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(cupon.fechaFinDev));
                
                if (fechaInicioDate && fechaFinDevDate && 
                    fechaValuacionDate >= fechaInicioDate && 
                    fechaValuacionDate <= fechaFinDevDate) {
                    cuponVigenteId = cupon.id;
                    cuponVigente = cupon;
                    break;
                }
            } catch (e) {
                // Ignorar errores de parsing
            }
        }
    }
    
    // Determinar qué cupones son posteriores al vigente basándose en fecha liquidación
    // Un cupón es posterior al vigente si su fecha liquidación > fecha liquidación del cupón vigente
    for (const cupon of cuponesData) {
        cupon.esPosteriorAlVigente = false;
    }
    
    if (cuponVigente && cuponVigente.fechaLiquid) {
        try {
            const fechaLiquidVigenteDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(cuponVigente.fechaLiquid));
            
            if (fechaLiquidVigenteDate) {
                for (const cupon of cuponesData) {
                    if (cupon.id === 'inversion' || cupon.id === cuponVigenteId) continue;
                    
                    if (cupon.fechaLiquid) {
                        try {
                            const fechaLiquidCuponDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(cupon.fechaLiquid));
                            
                            if (fechaLiquidCuponDate && fechaLiquidCuponDate > fechaLiquidVigenteDate) {
                                cupon.esPosteriorAlVigente = true;
                            }
                        } catch (e) {
                            // Ignorar errores de parsing
                        }
                    }
                }
            }
        } catch (e) {
            // Ignorar errores de parsing
        }
    }
    
    cuponesData.forEach(cupon => {
        const row = document.createElement('tr');
        row.dataset.cuponId = cupon.id;
        
        // Verificar si alguna fecha del cupón es mayor a fecha valuación
        let esFuturo = false;
        if (fechaValuacionDate) {
            // Comparar fechaLiquid (fecha de liquidación) con fecha valuación
            if (cupon.fechaLiquid) {
                try {
                    const fechaLiquidDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(cupon.fechaLiquid));
                    if (fechaLiquidDate && fechaLiquidDate > fechaValuacionDate) {
                        esFuturo = true;
                    }
                } catch (e) {
                    // Ignorar errores de parsing
                }
            }
        }
        
        if (!ajusteCER) {
            esFuturo = false;
        }
        
        // Aplicar clase si es futuro (los estilos se manejan con CSS)
        if (esFuturo) {
            row.classList.add('cupon-futuro');
        } else {
            row.classList.remove('cupon-futuro');
        }
        
        const bloqueoIntervaloAttrs = esFuturo ? 'readonly tabindex="-1"' : '';
        const bloqueoIntervaloClase = esFuturo ? ' input-bloqueado' : '';
        const bloqueoCERAttrs = esFuturo ? 'readonly tabindex="-1"' : '';
        const bloqueoCERClase = esFuturo ? ' input-bloqueado' : '';
        const onclickInicioIntervalo = esFuturo ? '' : `event.stopPropagation(); abrirDatePicker('inicioIntervalo_${cupon.id}');`;
        const onclickFinalIntervalo = esFuturo ? '' : `event.stopPropagation(); abrirDatePicker('finalIntervalo_${cupon.id}');`;
        
        row.innerHTML = `
            <td>
                <input type="text" class="input-table" value="${cupon.cupon || ''}" 
                       onchange="actualizarCupon('${cupon.id}', 'cupon', this.value)" 
                       style="width: 50px; text-align: center;" />
            </td>
            <td>
                <div style="position: relative;">
                    <input type="text" class="input-table date-input" 
                           id="fechaInicio_${cupon.id}"
                           value="${cupon.fechaInicio || ''}" 
                           placeholder="DD/MM/AAAA" 
                           maxlength="10"
                           onchange="actualizarCupon('${cupon.id}', 'fechaInicio', this.value)"
                           onclick="event.stopPropagation(); abrirDatePicker('fechaInicio_${cupon.id}');" />
                </div>
            </td>
            <td>
                <div style="position: relative;">
                    <input type="text" class="input-table date-input" 
                           id="fechaFinDev_${cupon.id}"
                           value="${cupon.fechaFinDev || ''}" 
                           placeholder="DD/MM/AAAA" 
                           maxlength="10"
                           onchange="actualizarCupon('${cupon.id}', 'fechaFinDev', this.value)"
                           onclick="event.stopPropagation(); abrirDatePicker('fechaFinDev_${cupon.id}');" />
                </div>
            </td>
            <td>
                <div style="position: relative;">
                    <input type="text" class="input-table date-input" 
                           id="fechaLiquid_${cupon.id}"
                           value="${cupon.fechaLiquid || ''}" 
                           placeholder="DD/MM/AAAA" 
                           maxlength="10"
                           onchange="actualizarCupon('${cupon.id}', 'fechaLiquid', this.value)"
                           onclick="event.stopPropagation(); abrirDatePicker('fechaLiquid_${cupon.id}');" />
                </div>
            </td>
            <td>
                <div style="position: relative;">
                    <input type="text" class="input-table date-input${bloqueoIntervaloClase}" 
                           id="inicioIntervalo_${cupon.id}"
                           value="${cupon.inicioIntervalo || ''}" 
                           placeholder="DD/MM/AAAA" 
                           maxlength="10"
                           onchange="actualizarCupon('${cupon.id}', 'inicioIntervalo', this.value)"
                           ${bloqueoIntervaloAttrs}
                           onclick="${onclickInicioIntervalo}" />
                </div>
            </td>
            <td>
                <div style="position: relative;">
                    <input type="text" class="input-table date-input${bloqueoIntervaloClase}" 
                           id="finalIntervalo_${cupon.id}"
                           value="${cupon.finalIntervalo || ''}" 
                           placeholder="DD/MM/AAAA" 
                           maxlength="10"
                           onchange="actualizarCupon('${cupon.id}', 'finalIntervalo', this.value)"
                           ${bloqueoIntervaloAttrs}
                           onclick="${onclickFinalIntervalo}" />
                </div>
            </td>
            ${ajusteCER ? `
            <td>
                <input type="number" class="input-table${bloqueoCERClase}" 
                       id="valorCERInicio_${cupon.id}"
                       value="${cupon.valorCERInicio || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'valorCERInicio', this.value)"
                       ${bloqueoCERAttrs} />
            </td>
            <td>
                <input type="number" class="input-table${bloqueoCERClase}" 
                       id="valorCERFinal_${cupon.id}"
                       value="${cupon.valorCERFinal || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'valorCERFinal', this.value)"
                       ${bloqueoCERAttrs} />
            </td>
            ` : `
            <td>
                <input type="number" class="input-table${cupon.esPosteriorAlVigente ? ' input-bloqueado' : ''}" 
                       id="promedioTasa_${cupon.id}"
                       value="${cupon.promedioTasa || ''}" 
                       step="0.0001"
                       ${cupon.esPosteriorAlVigente ? 'readonly tabindex="-1"' : ''}
                       onchange="${cupon.esPosteriorAlVigente ? '' : `actualizarCupon('${cupon.id}', 'promedioTasa', this.value)`}"
                       style="${cupon.esPosteriorAlVigente ? 'background-color: #f4f6f8; color: #5f6368; cursor: not-allowed;' : 'background-color: white; color: var(--text-primary);'}" />
            </td>
            `}
            <td>
                <input type="number" class="input-table" 
                       id="dayCountFactor_${cupon.id}"
                       value="${cupon.dayCountFactor || ''}" 
                       step="0.00000001"
                       onchange="actualizarCupon('${cupon.id}', 'dayCountFactor', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="amortiz_${cupon.id}"
                       value="${cupon.amortiz || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'amortiz', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="valorResidual_${cupon.id}"
                       value="${cupon.valorResidual || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'valorResidual', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="amortizAjustada_${cupon.id}"
                       value="${cupon.amortizAjustada || ''}" 
                       step="${stepAmortizAjustada}"
                       onchange="actualizarCupon('${cupon.id}', 'amortizAjustada', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="rentaNominal_${cupon.id}"
                       value="${cupon.rentaNominal || ''}" 
                       step="${stepRentaNominal}"
                       onchange="actualizarCupon('${cupon.id}', 'rentaNominal', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="rentaTNA_${cupon.id}"
                       value="${cupon.rentaTNA || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'rentaTNA', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="rentaAjustada_${cupon.id}"
                       value="${cupon.rentaAjustada || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'rentaAjustada', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="factorActualiz_${cupon.id}"
                       value="${cupon.factorActualiz || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'factorActualiz', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="pagosActualiz_${cupon.id}"
                       value="${cupon.pagosActualiz || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'pagosActualiz', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="flujos_${cupon.id}"
                       value="${cupon.flujos || ''}" 
                       step="${(typeof window.obtenerDecimalesAjustes === 'function' ? window.obtenerDecimalesAjustes() : 8) === 12 ? '0.000000000001' : '0.00000001'}"
                       readonly tabindex="-1" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="flujosDesc_${cupon.id}"
                       value="${cupon.flujosDesc || ''}" 
                       step="${(typeof window.obtenerDecimalesAjustes === 'function' ? window.obtenerDecimalesAjustes() : 8) === 12 ? '0.000000000001' : '0.00000001'}"
                       readonly tabindex="-1" />
            </td>
            <td>
                <div style="display: flex; gap: 4px; align-items: center;">
                    ${mostrarIconoLupa && cupon.inicioIntervalo && cupon.finalIntervalo ? `
                    <button class="btn-icon" onclick="verIntervaloEnTAMAR('${cupon.id}', '${tipoTasa}')" title="Ver intervalo en ${tipoTasa.toUpperCase()}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                    </button>
                    ` : ''}
                    <button class="btn-icon" onclick="eliminarFilaCupon('${cupon.id}')" title="Eliminar cupón">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Para calculadoras sin ajuste CER: asegurar que los intervalos sean consistentes con fechas
    if (!ajusteCER && window.cuponesRecalculos) {
        // Recalcular intervalos para todos los cupones para asegurar consistencia
        for (const cupon of cuponesData) {
            if (cupon.id === 'inversion') continue;
            
            // Asegurar que inicioIntervalo sea consistente con fechaInicio
            if (cupon.fechaInicio && window.cuponesRecalculos.recalcularInicioIntervalo) {
                await window.cuponesRecalculos.recalcularInicioIntervalo(cupon);
            }
            
            // Asegurar que finalIntervalo sea consistente con fechaFinDev
            if (cupon.fechaFinDev && window.cuponesRecalculos.recalcularFinalIntervaloSinRecalculosAdicionales) {
                await window.cuponesRecalculos.recalcularFinalIntervaloSinRecalculosAdicionales(cupon);
            }
        }
    }
    
    if (!ajusteCER && window.cuponesCalculos && typeof window.cuponesCalculos.calcularPromedioTAMAR === 'function') {
        const spread = normalizarNumeroDesdeInput(document.getElementById('spread')?.value) || 0;
        let promedioVigente = null;
        const decimalesRentaTNA = window.cuponesCalculos && typeof window.cuponesCalculos.obtenerDecimalesRentaTNA === 'function' 
            ? window.cuponesCalculos.obtenerDecimalesRentaTNA() : 4;
        
        // Paso 1: Calcular TAMAR solo para cupones que NO son posteriores al vigente (una sola vez cada uno)
        const cuponesParaCalcular = cuponesData.filter(cupon => 
            cupon.id !== 'inversion' && 
            !cupon.esPosteriorAlVigente && 
            cupon.inicioIntervalo && 
            cupon.finalIntervalo
        );
        
        // Calcular todos en paralelo para mejor rendimiento
        const resultados = await Promise.all(
            cuponesParaCalcular.map(async cupon => {
                const promedio = await window.cuponesCalculos.calcularPromedioTAMAR(cupon);
                return { cupon, promedio };
            })
        );
        
        // Procesar resultados y guardar el promedio del vigente
        for (const { cupon, promedio } of resultados) {
            if (promedio !== null && isFinite(promedio)) {
                if (cupon.id === cuponVigenteId) {
                    promedioVigente = promedio;
                }
            }
        }
        
        // Paso 2: Aplicar el promedio del vigente a los cupones posteriores
        if (promedioVigente !== null) {
            for (const cupon of cuponesData) {
                if (cupon.id === 'inversion') continue;
                
                if (cupon.esPosteriorAlVigente) {
                    actualizarCampoCupon(cupon, 'promedioTasa', formatearNumero(promedioVigente, 4));
                    const rentaTNAReplica = promedioVigente + spread;
                    actualizarCampoCupon(cupon, 'rentaTNA', formatearNumero(rentaTNAReplica, decimalesRentaTNA));
                }
            }
        }
    }
    // Para calculadoras con ajuste CER, NO calcular promedio TAMAR
    // La rentaTNA debe venir del input del formulario, no del promedio TAMAR
    // (calcularPromedioTAMAR solo es para calculadoras sin ajuste CER)
    
    if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularValoresDerivados === 'function') {
        window.cuponesCalculos.recalcularValoresDerivados(cuponesData);
    }
    
    if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularFlujos === 'function') {
        window.cuponesCalculos.recalcularFlujos(cuponesData);
    }
}

/**
 * Actualiza un valor de un cupón específico y recalcula dependencias
 */
async function actualizarCupon(cuponId, campo, valor) {
    const cupon = cuponesData.find(c => c.id === cuponId);
    if (cupon) {
        cupon[campo] = valor;
        
        const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
        
        // Si no hay ajuste CER y cambian las fechas, recalcular intervalos y promedios
        if (!ajusteCER) {
            // Si cambia fechaInicio, recalcular inicioIntervalo
            if (campo === 'fechaInicio' && window.cuponesRecalculos && window.cuponesRecalculos.recalcularInicioIntervalo) {
                await window.cuponesRecalculos.recalcularInicioIntervalo(cupon);
            }
            
            // Si cambia fechaFinDev, recalcular finalIntervalo
            if (campo === 'fechaFinDev' && window.cuponesRecalculos && window.cuponesRecalculos.recalcularFinalIntervaloSinRecalculosAdicionales) {
                await window.cuponesRecalculos.recalcularFinalIntervaloSinRecalculosAdicionales(cupon);
            }
            
            // Si cambian los intervalos, recalcular promedio TAMAR (solo si no es posterior al vigente)
            if ((campo === 'inicioIntervalo' || campo === 'finalIntervalo') && !cupon.esPosteriorAlVigente) {
                if (cupon.inicioIntervalo && cupon.finalIntervalo && window.cuponesCalculos && typeof window.cuponesCalculos.calcularPromedioTAMAR === 'function') {
                    await window.cuponesCalculos.calcularPromedioTAMAR(cupon);
                }
            }
        }
        
        // Si cambia promedioTasa manualmente, actualizar rentaTNA (solo si no es posterior al vigente)
        if (!ajusteCER && campo === 'promedioTasa' && !cupon.esPosteriorAlVigente) {
            const spread = normalizarNumeroDesdeInput(document.getElementById('spread')?.value) || 0;
            const promedio = normalizarNumeroDesdeInput(valor) || 0;
            const rentaTNA = promedio + spread;
            const decimalesRentaTNA = window.cuponesCalculos && typeof window.cuponesCalculos.obtenerDecimalesRentaTNA === 'function' 
                ? window.cuponesCalculos.obtenerDecimalesRentaTNA() : 4;
            actualizarCampoCupon(cupon, 'rentaTNA', formatearNumero(rentaTNA, decimalesRentaTNA));
        }
        
        // Si cambia rentaTNA manualmente, actualizar rentaNominal y rentaAjustada
        if (campo === 'rentaTNA') {
            // Recalcular valores derivados que dependen de rentaTNA (rentaNominal y rentaAjustada)
            if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularValoresDerivados === 'function') {
                window.cuponesCalculos.recalcularValoresDerivados(cuponesData);
            }
            // Recalcular flujos después de actualizar valores derivados
            if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularFlujos === 'function') {
                window.cuponesCalculos.recalcularFlujos(cuponesData);
            }
        }
        
        // Recalcular dependencias según el campo modificado
        if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularDependencias) {
            await window.cuponesRecalculos.recalcularDependencias(cupon, campo);
        }
        
        // Si cambió fechaInicio o fechaFinDev, puede haber cambiado el cupón vigente
        // Re-renderizar para actualizar los promedios de los cupones posteriores
        if (!ajusteCER && (campo === 'fechaInicio' || campo === 'fechaFinDev' || campo === 'fechaLiquid')) {
            // Re-renderizar para recalcular cupón vigente y promedios
            await renderizarCupones();
            return; // Salir temprano porque renderizarCupones ya recalcula todo
        }
        
        if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularValoresDerivados === 'function') {
            window.cuponesCalculos.recalcularValoresDerivados(cuponesData);
        }
        
        // Recalcular flujos después de actualizar valores derivados
        if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularFlujos === 'function') {
            window.cuponesCalculos.recalcularFlujos(cuponesData);
        }
    }
}

/**
 * Recalcula los campos dependientes cuando se modifica un campo
 * Cadena de dependencias:
 * - fechaInicio → inicioIntervalo → valorCERInicio
 * - fechaLiquid → finalIntervalo → valorCERFinal
 */
// Funciones de recálculo movidas a cupones/recalculos.js
// Se mantienen referencias para compatibilidad

/**
 * Obtiene todos los cupones
 */
function obtenerCupones() {
    return cuponesData;
}

/**
 * Limpia todos los cupones
 */
function limpiarCupones() {
    cuponesData = [];
    cuponCounter = 1;
    
    // Limpiar solo el estado del formulario (no los cupones ya que no se guardan)
    try {
        sessionStorage.removeItem('calculadora_formState');
    } catch (e) {
        console.warn('[limpiarCupones] Error al limpiar sessionStorage:', e);
    }
    
    renderizarCupones();
}

/**
 * Establece los datos de cupones y renderiza
 */
function setCuponesData(nuevosDatos) {
    cuponesData = nuevosDatos;
    // Asegurar que los IDs sean únicos
    cuponesData.forEach((cupon, index) => {
        if (!cupon.id) {
            cupon.id = cuponCounter++;
        }
    });
    
    // Guardar estado del formulario (sin guardar cupones en sessionStorage)
    if (typeof guardarEstadoFormulario === 'function') {
        guardarEstadoFormulario();
    }
    
    renderizarCupones();
    
    // Actualizar visibilidad de coeficientes CER
    if (typeof window.actualizarVisibilidadCoeficientesCER === 'function') {
        window.actualizarVisibilidadCoeficientesCER();
    }
}

/**
 * Obtiene los datos actuales de cupones
 */
function getCuponesData() {
    return cuponesData;
}

/**
 * Actualizar solo el estilo de las filas según fecha valuación (sin reconstruir la tabla)
 */
function actualizarEstilosCupones() {
    const tbody = document.getElementById('cuponesBody');
    if (!tbody) return;
    
    const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
    
    // Obtener fecha valuación para comparar
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    const fechaValuacionStr = fechaValuacionInput?.value || '';
    let fechaValuacionDate = null;
    
    if (fechaValuacionStr) {
        try {
            fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr));
        } catch (e) {
            console.warn('Error al parsear fecha valuación:', e);
        }
    }
    
    // Actualizar estilo de cada fila existente
    const filas = tbody.querySelectorAll('tr');
    filas.forEach(row => {
        const cuponId = row.dataset.cuponId;
        if (!cuponId) return;
        
        // Buscar el cupón en los datos
        const cupon = cuponesData.find(c => c.id === cuponId);
        if (!cupon) return;
        
        // Verificar si alguna fecha del cupón es mayor a fecha valuación
        let esFuturo = false;
        if (fechaValuacionDate && cupon.fechaLiquid) {
            try {
                const fechaLiquidDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(cupon.fechaLiquid));
                if (fechaLiquidDate && fechaLiquidDate > fechaValuacionDate) {
                    esFuturo = true;
                }
            } catch (e) {
                // Ignorar errores de parsing
            }
        }
        
        // Aplicar o remover clase
        if (!ajusteCER) {
            esFuturo = false;
        }
        
        if (esFuturo) {
            row.classList.add('cupon-futuro');
        } else {
            row.classList.remove('cupon-futuro');
        }
    });
}

// Exportar funciones globalmente - asignar directamente cada función
window.cuponesModule.cargarCupones = cargarCupones;
window.cuponesModule.agregarFilaCupon = agregarFilaCupon;
window.cuponesModule.eliminarFilaCupon = eliminarFilaCupon;
window.cuponesModule.renderizarCupones = renderizarCupones;
window.cuponesModule.actualizarEstilosCupones = actualizarEstilosCupones;
window.cuponesModule.actualizarCupon = actualizarCupon;
window.cuponesModule.obtenerCupones = obtenerCupones;
window.cuponesModule.limpiarCupones = limpiarCupones;
window.cuponesModule.setCuponesData = setCuponesData;
window.cuponesModule.getCuponesData = getCuponesData;

// Funciones de recálculo - se mantienen referencias para compatibilidad
window.cuponesModule.recalcularDependencias = function(cupon, campo) {
    if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularDependencias) {
        return window.cuponesRecalculos.recalcularDependencias(cupon, campo);
    }
};
window.cuponesModule.recalcularInicioIntervalo = function(cupon) {
    if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularInicioIntervalo) {
        return window.cuponesRecalculos.recalcularInicioIntervalo(cupon);
    }
};
window.cuponesModule.recalcularFinalIntervalo = function(cupon) {
    if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularFinalIntervalo) {
        return window.cuponesRecalculos.recalcularFinalIntervalo(cupon);
    }
};
window.cuponesModule.recalcularValorCERInicio = function(cupon) {
    if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularValorCERInicio) {
        return window.cuponesRecalculos.recalcularValorCERInicio(cupon);
    }
};
window.cuponesModule.recalcularValorCERFinal = function(cupon) {
    if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularValorCERFinal) {
        return window.cuponesRecalculos.recalcularValorCERFinal(cupon);
    }
};
window.cuponesModule.recalcularDayCountFactor = function(cupon) {
    if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularDayCountFactor) {
        return window.cuponesRecalculos.recalcularDayCountFactor(cupon);
    }
};

// También exportar actualizarCupon globalmente para el onclick en el HTML
window.actualizarCupon = actualizarCupon;

// Función para redirigir a TAMAR/BADLAR con fechas del intervalo del cupón
function verIntervaloEnTAMAR(cuponId, tipoTasa) {
    const cupones = getCuponesData();
    const cupon = cupones.find(c => c.id === cuponId);
    
    if (!cupon || !cupon.inicioIntervalo || !cupon.finalIntervalo) {
        console.warn('[verIntervaloEnTAMAR] Cupón no encontrado o sin intervalos válidos');
        return;
    }
    
    // Convertir fechas de DD/MM/AAAA a DD-MM-AAAA
    const fechaDesde = cupon.inicioIntervalo.replace(/\//g, '-');
    const fechaHasta = cupon.finalIntervalo.replace(/\//g, '-');
    
    // Determinar la ruta según el tipo de tasa (comparar en minúsculas)
    const tipoTasaLower = tipoTasa.toLowerCase();
    const ruta = tipoTasaLower === 'tamar' ? '/tamar' : '/badlar';
    
    // Redirigir con parámetros en la URL
    window.location.href = `${ruta}?desde=${fechaDesde}&hasta=${fechaHasta}`;
}

// Exportar función globalmente
window.verIntervaloEnTAMAR = verIntervaloEnTAMAR;

// Log para confirmar que el módulo está inicializado
console.log('[core.js] window.cuponesModule inicializado:', {
    setCuponesData: typeof window.cuponesModule.setCuponesData,
    getCuponesData: typeof window.cuponesModule.getCuponesData,
    renderizarCupones: typeof window.cuponesModule.renderizarCupones
});

