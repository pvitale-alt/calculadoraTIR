/**
 * Utilidades compartidas para formularios y máscaras
 */

/**
 * Aplicar máscara DD/MM/AAAA o DD-MM-AAAA mientras se escribe
 * @param {HTMLElement} input - Input element
 * @param {string} separador - Separador a usar ('/' por defecto, '-' para CER)
 */
function aplicarMascaraFecha(input, separador = '/') {
    if (!input) return;
    // No aplicar máscara a inputs de tipo number
    if (input.type === 'number') return;
    
    // Manejar teclas de borrado (Backspace y Delete)
    input.addEventListener('keydown', function(e) {
        const input = e.target;
        const cursorPos = input.selectionStart;
        const valor = input.value;
        
        // Si se presiona Backspace o Delete
        if (e.key === 'Backspace' || e.key === 'Delete') {
            // Si hay texto seleccionado, permitir borrado normal
            if (input.selectionStart !== input.selectionEnd) {
                return; // Permitir borrado normal
            }
            
            // Si se está borrando un separador, también borrar el carácter adyacente
            if (e.key === 'Backspace' && cursorPos > 0) {
                const charAntes = valor[cursorPos - 1];
                if (charAntes === separador) {
                    e.preventDefault();
                    // Borrar la barra y el carácter antes de ella
                    const nuevoValor = valor.substring(0, cursorPos - 2) + valor.substring(cursorPos);
                    input.value = nuevoValor;
                    // Reposicionar cursor (solo si el input no es de tipo number)
                    setTimeout(() => {
                        if (input.type !== 'number') {
                            input.setSelectionRange(cursorPos - 2, cursorPos - 2);
                        }
                    }, 0);
                    return;
                }
            }
            
            if (e.key === 'Delete' && cursorPos < valor.length) {
                const charDespues = valor[cursorPos];
                if (charDespues === '/') {
                    e.preventDefault();
                    // Borrar la barra y el carácter después de ella
                    const nuevoValor = valor.substring(0, cursorPos) + valor.substring(cursorPos + 2);
                    input.value = nuevoValor;
                    // Mantener cursor en la misma posición (solo si el input no es de tipo number)
                    setTimeout(() => {
                        if (input.type !== 'number') {
                            input.setSelectionRange(cursorPos, cursorPos);
                        }
                    }, 0);
                    return;
                }
            }
        }
    });
    
    input.addEventListener('input', function(e) {
        const input = e.target;
        let valor = input.value.replace(/\D/g, ''); // Solo números
        
        // Si se borró todo, limpiar el campo
        if (valor === '') {
            input.value = '';
            return;
        }
        
        // Aplicar formato con separador
        if (valor.length >= 2) {
            valor = valor.substring(0, 2) + separador + valor.substring(2);
        }
        if (valor.length >= 5) {
            valor = valor.substring(0, 5) + separador + valor.substring(5, 9);
        }
        
        // Limitar a 10 caracteres (DD/MM/AAAA)
        if (valor.length > 10) {
            valor = valor.substring(0, 10);
        }
        
        const cursorPosAntes = input.selectionStart;
        input.value = valor;
        
        // Ajustar posición del cursor después de agregar barras
        let nuevaPosicion = cursorPosAntes;
        if (valor.length === 3 && cursorPosAntes === 2) {
            // Si se acaba de agregar la primera barra, mover cursor después
            nuevaPosicion = 3;
        } else if (valor.length === 6 && cursorPosAntes === 5) {
            // Si se acaba de agregar la segunda barra, mover cursor después
            nuevaPosicion = 6;
        } else if (valor.length < cursorPosAntes) {
            // Si se borró algo, mantener posición relativa
            nuevaPosicion = Math.min(cursorPosAntes, valor.length);
        }
        
        setTimeout(() => {
            // Solo usar setSelectionRange si el input no es de tipo number
            if (input.type !== 'number') {
                input.setSelectionRange(nuevaPosicion, nuevaPosicion);
            }
        }, 0);
    });
    
    input.addEventListener('blur', function(e) {
        if (e.target.value && !validarFechaDDMMAAAA(e.target.value)) {
            e.target.style.borderColor = '#d93025';
            if (typeof showError === 'function') {
                showError('Formato de fecha inválido. Use DD/MM/AAAA');
            }
        } else {
            e.target.style.borderColor = '';
        }
    });
}

/**
 * Aplicar máscara de fecha para formato DD/MM (sin año)
 */
function aplicarMascaraFechaDDMM(input) {
    if (!input) return;
    // No aplicar máscara a inputs de tipo number
    if (input.type === 'number') return;
    
    input.addEventListener('keydown', function(e) {
        const input = e.target;
        const cursorPos = input.selectionStart;
        const valor = input.value;
        
        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (input.selectionStart !== input.selectionEnd) {
                return;
            }
            
            if (e.key === 'Backspace' && cursorPos > 0) {
                const charAntes = valor[cursorPos - 1];
                if (charAntes === '/') {
                    e.preventDefault();
                    const nuevoValor = valor.substring(0, cursorPos - 2) + valor.substring(cursorPos);
                    input.value = nuevoValor;
                    setTimeout(() => {
                        input.setSelectionRange(cursorPos - 2, cursorPos - 2);
                    }, 0);
                    return;
                }
            }
            
            if (e.key === 'Delete' && cursorPos < valor.length) {
                const charDespues = valor[cursorPos];
                if (charDespues === '/') {
                    e.preventDefault();
                    const nuevoValor = valor.substring(0, cursorPos) + valor.substring(cursorPos + 2);
                    input.value = nuevoValor;
                    setTimeout(() => {
                        input.setSelectionRange(cursorPos, cursorPos);
                    }, 0);
                    return;
                }
            }
        }
    });
    
    input.addEventListener('input', function(e) {
        const input = e.target;
        let valor = input.value.replace(/\D/g, '');
        
        if (valor === '') {
            input.value = '';
            return;
        }
        
        // Aplicar formato con barra
        if (valor.length >= 2) {
            valor = valor.substring(0, 2) + '/' + valor.substring(2, 4);
        }
        
        // Limitar a 5 caracteres (DD/MM)
        if (valor.length > 5) {
            valor = valor.substring(0, 5);
        }
        
        const cursorPosAntes = input.selectionStart;
        input.value = valor;
        
        let nuevaPosicion = cursorPosAntes;
        if (valor.length === 3 && cursorPosAntes === 2) {
            nuevaPosicion = 3;
        } else if (valor.length < cursorPosAntes) {
            nuevaPosicion = Math.min(cursorPosAntes, valor.length);
        }
        
        setTimeout(() => {
            // Solo usar setSelectionRange si el input no es de tipo number
            if (input.type !== 'number') {
                input.setSelectionRange(nuevaPosicion, nuevaPosicion);
            }
        }, 0);
    });
    
    input.addEventListener('blur', function(e) {
        const valor = e.target.value;
        if (valor && !/^\d{2}\/\d{2}$/.test(valor)) {
            e.target.style.borderColor = '#d93025';
            if (typeof showError === 'function') {
                showError('Formato de fecha inválido. Use DD/MM');
            }
        } else {
            e.target.style.borderColor = '';
        }
    });
}

/**
 * Formatear número para mostrar
 * @param {number|string} numero - Número a formatear
 * @param {number} decimales - Cantidad de decimales (2 por defecto, 4 para CER/TAMAR/BADLAR)
 * @returns {string} Número formateado
 */
function formatearNumero(numero, decimales = 2) {
    if (numero === null || numero === undefined || isNaN(numero)) return '-';
    return parseFloat(numero).toLocaleString('es-AR', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}



