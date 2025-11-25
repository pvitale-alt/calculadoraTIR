# Calculadora TIR - Versión 2.0

Calculadora de TIR (Tasa Interna de Retorno) para bonos con diferentes tipos de ajuste (CER, TAMAR, BADLAR). Versión refactorizada con estructura escalable y código mantenible.

## 🎯 Objetivo

Esta calculadora permite, en base a datos de partida y especie, generar el cashflow de los bonos y calcular la TIR. La calculadora escala dependiendo del tipo de ajuste que tienen los bonos.

## 📋 Características

- **5 Solapas principales:**
  - **Calculadora**: Cálculo principal de TIR y cashflow
  - **CER**: Gestión de datos CER
  - **TAMAR**: Gestión de datos TAMAR
  - **BADLAR**: Gestión de datos BADLAR
  - **Feriados**: Gestión de días feriados

## 🚀 Tecnologías

- **Backend**: Node.js + Express
- **Frontend**: EJS (templates)
- **Estilos**: CSS personalizado (estilo Google Drive)
- **Base de datos**: PostgreSQL (Neon)
- **Hosting**: Vercel

## 📁 Estructura del Proyecto

```
calculadora2/
├── src/
│   ├── app.js                 # Entrada principal
│   ├── config/                # Configuración (database, env)
│   ├── controllers/           # Lógica de negocio
│   │   └── calculadoraController.js
│   ├── models/                # Modelos de datos
│   ├── routes/                # Definición de rutas
│   │   └── indexRoutes.js
│   ├── services/              # Servicios (APIs externas, lógica compleja)
│   ├── middleware/            # Middleware personalizado
│   ├── utils/                 # Funciones auxiliares
│   ├── public/                # Archivos estáticos
│   │   ├── css/
│   │   │   └── main.css
│   │   ├── js/
│   │   │   └── main.js
│   │   └── images/
│   └── views/                 # Templates EJS
│       ├── layouts/
│       ├── partials/
│       │   └── header.ejs
│       └── pages/
│           ├── calculadora.ejs
│           ├── cer.ejs
│           ├── tamar.ejs
│           ├── badlar.ejs
│           ├── feriados.ejs
│           └── 404.ejs
├── Database/                  # Scripts de base de datos
├── .env.example               # Plantilla de variables de entorno
├── .gitignore
├── package.json
├── README.md
└── vercel.json                # Configuración de Vercel
```

## 🛠️ Instalación

### Requisitos previos

- Node.js >= 18.x
- PostgreSQL (Neon recomendado)
- Git

### Pasos

1. **Clonar el repositorio** (o crear desde cero):
   ```bash
   git clone <url-del-repositorio>
   cd calculadora2
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   ```
   
   Editar `.env` y configurar:
   ```env
   PORT=3000
   NODE_ENV=development
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   BCRA_API_URL=https://api.bcra.gob.ar/estadisticas/v4.0
   ```

4. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

5. **Abrir en el navegador**:
   ```
   http://localhost:3000
   ```

## 📝 Scripts Disponibles

- `npm run dev`: Inicia el servidor en modo desarrollo con nodemon
- `npm start`: Inicia el servidor en modo producción
- `npm run build`: Build del proyecto (para Vercel)
- `npm run vercel-build`: Build específico para Vercel

## 🌐 Deploy en Vercel

1. Conectar el repositorio de GitHub a Vercel
2. Configurar las variables de entorno en el dashboard de Vercel:
   - `DATABASE_URL`
   - `NODE_ENV=production`
   - `BCRA_API_URL=https://api.bcra.gob.ar/estadisticas/v4.0`
3. El deploy se realizará automáticamente en cada push a la rama principal

## 🎨 Estilos

El proyecto utiliza un sistema de diseño inspirado en Google Drive, con:
- Fuentes: Google Sans y Roboto
- Colores corporativos: Azul (#316ba1)
- Componentes reutilizables: Cards, botones, inputs, tabs

## 📚 Próximos Pasos

- [ ] Implementar lógica de cálculo de TIR
- [ ] Implementar generación de cashflow
- [ ] Implementar gestión de datos CER
- [ ] Implementar gestión de datos TAMAR
- [ ] Implementar gestión de datos BADLAR
- [ ] Implementar gestión de feriados
- [ ] Implementar persistencia de datos
- [ ] Agregar validaciones
- [ ] Agregar tests

## 🤝 Contribución

Este proyecto está en desarrollo activo. La estructura está diseñada para ser escalable y mantenible.

## 📄 Licencia

ISC

## 👥 Autor

Mercap Software

