const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// Ruta base para documentos por paciente
const documentosPath = path.join(__dirname, 'public', 'documentos');

// Carpeta para documentos institucionales
const documentosInstitucionPath = path.join(__dirname, 'public', 'documentos-institucion');
if (!fs.existsSync(documentosInstitucionPath)) {
    fs.mkdirSync(documentosInstitucionPath, { recursive: true });
}

// Cambiar a memoryStorage para evitar acceder a req.body temprano
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

// Nueva configuración Multer para carga masiva (sin requerir sede/nombre)
const uploadMasivo = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const tempPath = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempPath)) {
                fs.mkdirSync(tempPath);
            }
            cb(null, tempPath);
        },
        filename: (req, file, cb) => {
            cb(null, 'carga-masiva-' + Date.now() + path.extname(file.originalname));
        }
    })
});

// Multer para documentos institucionales (múltiples archivos)
const uploadDocumentos = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, documentosInstitucionPath);
        },
        filename: (req, file, cb) => {
            // Nombre único para evitar sobrescribir
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname);
        }
    })
});

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error al conectar con SQLite:', err);
    } else {
        console.log('Conectado a la base de datos SQLite');
    }
});

db.serialize(() => {
    // Tabla pacientes con campos de pago
    db.run(`
    CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        documento_tipo TEXT NOT NULL DEFAULT 'rut',
        documento_numero TEXT NOT NULL UNIQUE,
        documento_tipo_apoderado TEXT,
        documento_numero_apoderado TEXT,
        sede TEXT NOT NULL,
        estado TEXT DEFAULT 'Activo',
        etapa TEXT,
        fecha_ingreso DATE NOT NULL,
        psiquiatra TEXT,
        doctor TEXT,
        tipo_atencion TEXT,
        fecha_ultima_receta DATE,
        fecha_termino_licencia DATE,
        nombre_apoderado TEXT,
        telefono_apoderado TEXT,
        clave_unica TEXT,
        correo TEXT,
        foto_cedula TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        monto_mensual INTEGER DEFAULT 350000,
        fecha_vencimiento_pago INTEGER DEFAULT 5,
        sexo TEXT CHECK(sexo IN ('Masculino', 'Femenino')),
        fecha_nacimiento DATE,
        ocupacion TEXT,
        prevision TEXT,
        otros_contactos TEXT,
        direccion TEXT,
        direccion_apoderado TEXT,
        atencion_psiquiatrica TEXT,
        fecha_cambio_estado DATE,
        region TEXT,
        comuna TEXT,
        correo_apoderado TEXT
    )
`);

    // NUEVA TABLA DE PAGOS
    db.run(`
        CREATE TABLE IF NOT EXISTS pagos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL,
            año INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            pagado INTEGER DEFAULT 0,
            fecha_pago DATE,
            forma_pago TEXT,
            UNIQUE(paciente_id, año, mes),
            FOREIGN KEY(paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
        )
    `);

    // Tabla usuarios
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL UNIQUE,
            contraseña TEXT NOT NULL
        )
    `);

    // FORZAR CREACIÓN DEL USUARIO ADMIN (para debug)
    const adminUser = 'admin';
    const adminPass = 'evolucion2025';

    console.log('Intentando crear o verificar usuario admin...');

    db.get("SELECT * FROM usuarios WHERE usuario = ?", [adminUser], (err, row) => {
        if (err) {
            console.error('Error al consultar usuario:', err);
            return;
        }

        if (row) {
            console.log('Usuario admin ya existe en la base de datos');
        } else {
            console.log('Usuario admin no existe, creando...');
            bcrypt.hash(adminPass, 10, (hashErr, hash) => {
                if (hashErr) {
                    console.error('Error al hashear contraseña:', hashErr);
                    return;
                }
                db.run("INSERT INTO usuarios (usuario, contraseña) VALUES (?, ?)", [adminUser, hash], (insertErr) => {
                    if (insertErr) {
                        console.error('Error al insertar usuario:', insertErr);
                    } else {
                        console.log('¡Usuario admin creado exitosamente! Credenciales: admin / evolucion2025');
                    }
                });
            });
        }
    });

    // Migraciones para columnas nuevas (si la tabla ya existe)
    db.all("PRAGMA table_info(pacientes)", (err, rows) => {
        if (err) return console.error(err);
        const columnExists = (name) => rows.some(row => row.name === name);

        if (!columnExists('sexo')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN sexo TEXT CHECK(sexo IN ('Masculino', 'Femenino'))`);
            console.log('Columna sexo agregada');
        }

        if (!columnExists('direccion')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN direccion TEXT`);
            console.log('Columna direccion agregada');
        }
        if (!columnExists('direccion_apoderado')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN direccion_apoderado TEXT`);
            console.log('Columna direccion_apoderado agregada');
        }

        if (!columnExists('fecha_nacimiento')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN fecha_nacimiento DATE`);
            console.log('Columna fecha_nacimiento agregada');
        }

        if (!columnExists('atencion_psiquiatrica')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN atencion_psiquiatrica TEXT`);
            console.log('Columna atencion_psiquiatrica agregada');
        }

        if (!columnExists('ocupacion')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN ocupacion TEXT`);
            console.log('Columna ocupacion agregada');
        }
        if (!columnExists('prevision')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN prevision TEXT`);
            console.log('Columna prevision agregada');
        }
        if (!columnExists('otros_contactos')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN otros_contactos TEXT`);
            console.log('Columna otros_contactos agregada');
        }
        if (!columnExists('documento_tipo')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN documento_tipo TEXT NOT NULL DEFAULT 'rut'`);
            console.log('Columna documento_tipo agregada');
        }
        if (!columnExists('documento_numero')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN documento_numero TEXT NOT NULL DEFAULT ''`);
            db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_documento_numero ON pacientes(documento_numero)`);
            console.log('Columna documento_numero agregada con UNIQUE');
        }
        if (!columnExists('documento_tipo_apoderado')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN documento_tipo_apoderado TEXT`);
            console.log('Columna documento_tipo_apoderado agregada');
        }
        if (!columnExists('documento_numero_apoderado')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN documento_numero_apoderado TEXT`);
            console.log('Columna documento_numero_apoderado agregada');
        }
        if (!columnExists('fecha_cambio_estado')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN fecha_cambio_estado DATE`);
            console.log('Columna fecha_cambio_estado agregada');
        }
        if (!columnExists('region')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN region TEXT`);
            console.log('Columna region agregada');
        }
        if (!columnExists('comuna')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN comuna TEXT`);
            console.log('Columna comuna agregada');
        }
        if (!columnExists('correo_apoderado')) {
            db.run(`ALTER TABLE pacientes ADD COLUMN correo_apoderado TEXT`);
            console.log('Columna correo_apoderado agregada');
        }

        // Migrar datos antiguos de la columna 'rut' (si existe) a las nuevas columnas
        db.get("SELECT COUNT(*) as count FROM pacientes WHERE documento_numero = '' AND rut IS NOT NULL", (err, row) => {
            if (row && row.count > 0) {
                db.run(`UPDATE pacientes SET documento_numero = rut, documento_tipo = 'rut' WHERE rut IS NOT NULL`);
                console.log('Datos antiguos migrados de rut a documento_numero');
            }
        });
    });

    // Migración condicional para forma_pago en tabla pagos
    db.all("PRAGMA table_info(pagos)", (err, rows) => {
        if (err) return console.error(err);
        const columnExists = (name) => rows.some(row => row.name === name);

        if (!columnExists('forma_pago')) {
            db.run(`ALTER TABLE pagos ADD COLUMN forma_pago TEXT`);
            console.log('Columna forma_pago agregada a pagos');
        }
    });
});

// Función para obtener ruta de foto
function getFotoPath(sede, nombre) {
    const pacientePath = path.join(documentosPath, sede.trim(), nombre.trim());
    const possibleExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (const ext of possibleExts) {
        const filePath = path.join(pacientePath, 'cedula' + ext);
        if (fs.existsSync(filePath)) {
            return '/documentos/' + encodeURIComponent(sede.trim()) + '/' + encodeURIComponent(nombre.trim()) + '/cedula' + ext;
        }
    }
    return null;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Carpeta estática para documentos institucionales
app.use('/documentos-institucion', express.static(documentosInstitucionPath));

// GET todos los pacientes
app.get('/api/pacientes', (req, res) => {
    db.all('SELECT * FROM pacientes ORDER BY fecha_ingreso DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            rows.forEach(p => p.foto_cedula = getFotoPath(p.sede, p.nombre));
            res.json(rows);
        }
    });
});

// GET paciente por ID
app.get('/api/pacientes/:id', (req, res) => {
    db.get('SELECT * FROM pacientes WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) {
            res.status(404).json({ error: 'Paciente no encontrado' });
        } else {
            row.foto_cedula = getFotoPath(row.sede, row.nombre);
            res.json(row);
        }
    });
});

// GET pagos de un paciente (MEJORADO CON FORMA_PAGO)
app.get('/api/pacientes/:id/pagos', (req, res) => {
    const pacienteId = req.params.id;
    db.all(
        'SELECT año, mes, pagado, fecha_pago, forma_pago FROM pagos WHERE paciente_id = ? ORDER BY año DESC, mes DESC',
        [pacienteId],
        (err, rows) => {
            if (err) {
                console.error('Error consultando pagos:', err);
                res.json([]);
            } else {
                res.json(rows || []);
            }
        }
    );
});

// POST pagos (al editar)
app.post('/api/pacientes/:id/pagos', (req, res) => {
    const { pagos } = req.body;
    const pacienteId = req.params.id;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare('INSERT OR REPLACE INTO pagos (paciente_id, año, mes, pagado, fecha_pago, forma_pago) VALUES (?, ?, ?, ?, ?, ?)');
        pagos.forEach(p => {
            const fechaPago = p.pagado ? (p.fecha_pago || new Date().toISOString().split('T')[0]) : null;
            const formaPago = p.forma_pago || null;
            stmt.run(pacienteId, p.año, p.mes, p.pagado ? 1 : 0, fechaPago, formaPago);
        });
        stmt.finalize(() => {
            db.run('COMMIT', () => res.json({ success: true }));
        });
    });
});

// POST nuevo paciente + crear 12 meses pendientes
app.post('/api/pacientes', upload.single('foto_cedula'), (req, res) => {
    const body = req.body;

    let fotoPath = null;
    if (req.file) {
        const pacientePath = path.join(documentosPath, body.sede.trim(), body.nombre.trim());
        fs.mkdirSync(pacientePath, { recursive: true });
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filePath = path.join(pacientePath, 'cedula' + ext);
        fs.writeFileSync(filePath, req.file.buffer);
        fotoPath = '/documentos/' + encodeURIComponent(body.sede.trim()) + '/' + encodeURIComponent(body.nombre.trim()) + '/cedula' + ext;
    }

    const documento_tipo = body.documento_tipo || 'rut';
    const documento_numero = body.documento_numero ? body.documento_numero.trim() : '';
    const documento_tipo_apoderado = body.documento_tipo_apoderado || '';
    const documento_numero_apoderado = body.documento_numero_apoderado ? body.documento_numero_apoderado.trim() : '';

    const {
        nombre, sede, fecha_ingreso,
        estado = 'Activo', etapa = null,
        psiquiatra = null, doctor = null, tipo_atencion = null,
        fecha_ultima_receta = null, fecha_termino_licencia = null,
        nombre_apoderado = null,
        telefono_apoderado = null, clave_unica = null, correo = null,
        monto_mensual = 350000, fecha_vencimiento_pago = 5,
        sexo = null, fecha_nacimiento = null, ocupacion = null, prevision = null,
        atencion_psiquiatrica = null,
        direccion = null,
        direccion_apoderado = null,
        otros_contactos = null,
        region = null,
        comuna = null,
        correo_apoderado = null
    } = body;

    if (!nombre || !documento_numero || !sede || !fecha_ingreso) {
        return res.status(400).json({ error: 'Campos obligatorios faltantes (nombre, número de documento, sede o fecha de ingreso)' });
    }

    const sql = `INSERT INTO pacientes (
        nombre, documento_tipo, documento_numero, documento_tipo_apoderado, documento_numero_apoderado,
        sede, estado, etapa, fecha_ingreso,
        psiquiatra, doctor, tipo_atencion, fecha_ultima_receta,
        fecha_termino_licencia, nombre_apoderado,
        telefono_apoderado, clave_unica, correo, foto_cedula,
        monto_mensual, fecha_vencimiento_pago,
        sexo, fecha_nacimiento, ocupacion, prevision, atencion_psiquiatrica,
        otros_contactos, direccion, direccion_apoderado,
        fecha_cambio_estado, region, comuna, correo_apoderado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        nombre, documento_tipo, documento_numero, documento_tipo_apoderado, documento_numero_apoderado,
        sede, estado, etapa, fecha_ingreso,
        psiquiatra, doctor, tipo_atencion, fecha_ultima_receta,
        fecha_termino_licencia, nombre_apoderado,
        telefono_apoderado, clave_unica, correo, fotoPath,
        parseInt(monto_mensual), parseInt(fecha_vencimiento_pago),
        sexo, fecha_nacimiento, ocupacion, prevision,
        atencion_psiquiatrica || null,
        otros_contactos || null, direccion || null, direccion_apoderado || null,
        null, region || null, comuna || null, correo_apoderado || null
    ];

    db.run(sql, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                res.status(400).json({ error: 'Número de documento ya registrado' });
            } else {
                console.error('Error al registrar paciente:', err);
                res.status(500).json({ error: err.message });
            }
        } else {
            const pacienteId = this.lastID;
            const fechaIngreso = new Date(fecha_ingreso);
            const pagosIniciales = [];
            for (let i = 0; i < 12; i++) {
                const date = new Date(fechaIngreso.getFullYear(), fechaIngreso.getMonth() + i, 1);
                pagosIniciales.push([pacienteId, date.getFullYear(), date.getMonth() + 1, 0, null, null]);
            }
            const stmt = db.prepare('INSERT INTO pagos (paciente_id, año, mes, pagado, fecha_pago, forma_pago) VALUES (?, ?, ?, ?, ?, ?)');
            pagosIniciales.forEach(p => stmt.run(...p));
            stmt.finalize();

            res.json({ id: pacienteId, foto_cedula: fotoPath });
        }
    });
});

app.put('/api/pacientes/:id', upload.single('foto_cedula'), (req, res) => {
    const body = req.body;
    let fotoPath = null;
    if (req.file) {
        const pacientePath = path.join(documentosPath, body.sede.trim(), body.nombre.trim());
        fs.mkdirSync(pacientePath, { recursive: true });
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filePath = path.join(pacientePath, 'cedula' + ext);
        fs.writeFileSync(filePath, req.file.buffer);
        fotoPath = '/documentos/' + encodeURIComponent(body.sede.trim()) + '/' + encodeURIComponent(body.nombre.trim()) + '/cedula' + ext;
    }

    db.get('SELECT nombre, sede, fecha_ingreso FROM pacientes WHERE id = ?', [req.params.id], (err, old) => {
        if (err || !old) return res.status(404).json({ error: 'Paciente no encontrado' });

        const nuevoNombre = body.nombre?.trim() || old.nombre;
        const nuevaSede = body.sede?.trim() || old.sede;
        const nuevaFechaIngreso = body.fecha_ingreso || old.fecha_ingreso;

        if (!nuevaFechaIngreso) {
            return res.status(400).json({ error: 'Fecha de ingreso es obligatoria' });
        }

        fs.mkdirSync(path.join(documentosPath, nuevaSede, nuevoNombre), { recursive: true });

        const sql = `UPDATE pacientes SET 
            nombre = ?, 
            sede = ?, 
            estado = ?, 
            etapa = ?, 
            fecha_ingreso = ?,
            psiquiatra = ?, 
            doctor = ?, 
            tipo_atencion = ?,
            fecha_ultima_receta = ?, 
            fecha_termino_licencia = ?,
            nombre_apoderado = ?, 
            telefono_apoderado = ?,
            clave_unica = ?, 
            correo = ?, 
            foto_cedula = ?,
            monto_mensual = ?, 
            fecha_vencimiento_pago = ?,
            sexo = ?, 
            fecha_nacimiento = ?, 
            ocupacion = ?, 
            prevision = ?,
            direccion = ?,
            direccion_apoderado = ?,
            otros_contactos = ?,
            documento_tipo = ?,
            documento_numero = ?,
            documento_tipo_apoderado = ?,
            documento_numero_apoderado = ?,
            fecha_cambio_estado = ?, 
            region = ?, 
            comuna = ?, 
            correo_apoderado = ?
            WHERE id = ?`;

        const params = [
            nuevoNombre, 
            nuevaSede,
            body.estado || 'Activo',
            body.etapa || null,
            nuevaFechaIngreso,
            body.psiquiatra || null,
            body.doctor || null,
            body.tipo_atencion || null,
            body.fecha_ultima_receta || null,
            body.fecha_termino_licencia || null,
            body.nombre_apoderado || null,
            body.telefono_apoderado || null,
            body.clave_unica || null,
            body.correo || null,
            fotoPath,
            parseInt(body.monto_mensual) || 350000,
            parseInt(body.fecha_vencimiento_pago) || 5,
            body.sexo || null,
            body.fecha_nacimiento || null,
            body.ocupacion || null,
            body.prevision || null,
            body.direccion || null,
            body.direccion_apoderado || null,
            body.otros_contactos || null,
            body.documento_tipo || 'rut',
            body.documento_numero || '',
            body.documento_tipo_apoderado || '',
            body.documento_numero_apoderado || '',
            body.fecha_cambio_estado || null,
            body.region || null,
            body.comuna || null,
            body.correo_apoderado || null,
            req.params.id
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Error SQL al actualizar:', err);
                res.status(500).json({ error: err.message });
            } else {
                res.json({ success: true, changes: this.changes });
            }
        });
    });
});

// API para pagos pendientes (para la sección Control de Pagos)
app.get('/api/pagos-pendientes', (req, res) => {
    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;

    db.all(`
        SELECT p.id, p.nombre, p.documento_numero, p.sede, p.monto_mensual,
               pag.año, pag.mes, pag.pagado
        FROM pacientes p
        LEFT JOIN pagos pag ON p.id = pag.paciente_id 
            AND (pag.año < ? OR (pag.año = ? AND pag.mes <= ?))
        WHERE p.estado = 'Activo'
        ORDER BY p.sede, p.nombre, pag.año, pag.mes
    `, [añoActual, añoActual, mesActual], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const pacientesPendientes = {};
        let totalPendiente = 0;

        rows.forEach(row => {
            if (row.pagado === 1) return; // ya pagó

            if (!pacientesPendientes[row.id]) {
                pacientesPendientes[row.id] = {
                    id: row.id,
                    nombre: row.nombre,
                    documento_numero: row.documento_numero,
                    sede: row.sede,
                    monto_mensual: row.monto_mensual,
                    meses_pendientes: []
                };
            }
            if (row.año && row.mes) {
                const mesStr = `${row.año}-${String(row.mes).padStart(2, '0')}`;
                pacientesPendientes[row.id].meses_pendientes.push(mesStr);
                totalPendiente += row.monto_mensual;
            }
        });

        res.json({
            pacientes: Object.values(pacientesPendientes),
            total_pendiente: totalPendiente
        });
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === ELIMINACIÓN MASIVA (PROTEGIDA) ===
app.delete('/api/eliminar-todo', (req, res) => {
    try {
        // 1. Borrar todos los pacientes de la base de datos
        db.run(`DELETE FROM pagos`); // primero pagos por foreign key
        db.run(`DELETE FROM pacientes`);

        // 2. Borrar todas las carpetas de documentos
        const documentosPath = path.join(__dirname, 'public', 'documentos');
        if (fs.existsSync(documentosPath)) {
            fs.rmSync(documentosPath, { recursive: true, force: true });
            fs.mkdirSync(documentosPath); // recrear carpeta vacía
        }

        // Borrar documentos institucionales
        if (fs.existsSync(documentosInstitucionPath)) {
            fs.rmSync(documentosInstitucionPath, { recursive: true, force: true });
            fs.mkdirSync(documentosInstitucionPath);
        }

        res.json({ success: true, message: 'Todos los pacientes y archivos eliminados' });
    } catch (err) {
        console.error('Error en eliminación masiva:', err);
        res.status(500).json({ error: 'Error interno al eliminar' });
    }
});

// === CARGA MASIVA PARA PRUEBAS (VERSIÓN QUE FUNCIONA CON FECHAS DE EXCEL) ===
const XLSX = require('xlsx');

const uploadCargaMasiva = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const tempPath = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath);
            cb(null, tempPath);
        },
        filename: (req, file, cb) => {
            cb(null, 'carga-masiva-' + Date.now() + path.extname(file.originalname));
        }
    })
});

app.post('/api/carga-masiva-pruebas', uploadCargaMasiva.single('archivo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(sheet, { 
            header: 1, 
            raw: false,
            dateNF: 'yyyy-mm-dd'
        });

        if (rows.length <= 1) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'El archivo está vacío o solo tiene encabezado' });
        }

        const datos = rows.slice(1);

        let agregados = 0;
        const errores = [];

        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO pacientes 
            (nombre, documento_tipo, documento_numero, sede, fecha_ingreso, estado, etapa)
            VALUES (?, 'rut', ?, ?, ?, ?, ?)
        `);

        datos.forEach((row, index) => {
            if (row.length < 6) {
                errores.push({ fila: index + 2, mensaje: 'Faltan columnas' });
                return;
            }

            let [nombre, documento_numero, sede, fechaCell, estado, etapa] = row;

            nombre = (nombre || '').toString().trim();
            documento_numero = (documento_numero || '').toString().trim();
            sede = (sede || '').toString().trim();
            estado = (estado || 'Activo').toString().trim();
            etapa = (etapa || 'Compromiso').toString().trim();

            if (!nombre || !documento_numero || !sede) {
                errores.push({ fila: index + 2, mensaje: 'Faltan datos obligatorios' });
                return;
            }

            let fechaIngreso = null;

            if (fechaCell instanceof Date) {
                fechaIngreso = fechaCell.toISOString().slice(0, 10);
            } else if (typeof fechaCell === 'number') {
                const d = XLSX.SSF.parse_date_code(fechaCell);
                if (d) {
                    fechaIngreso = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
                }
            } else if (typeof fechaCell === 'string') {
                const clean = fechaCell.trim().replace(/\//g, '-');
                const partes = clean.split('-');
                if (partes.length === 3 && partes[2].length === 4) {
                    fechaIngreso = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
                }
            }

            if (!fechaIngreso) {
                errores.push({ fila: index + 2, mensaje: 'Fecha inválida o no reconocida' });
                return;
            }

            try {
                insertStmt.run(nombre, documento_numero, sede, fechaIngreso, estado, etapa);
                agregados++;
            } catch (err) {
                errores.push({ fila: index + 2, mensaje: err.message.includes('UNIQUE') ? 'Número de documento duplicado' : 'Error al insertar' });
            }
        });

        insertStmt.finalize();
        fs.unlinkSync(req.file.path);

        res.json({ agregados, errores });
    } catch (err) {
        console.error('Error en carga masiva:', err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Error procesando el archivo' });
    }
});

// === DOCUMENTOS INSTITUCIONALES ===
app.post('/api/documentos-institucion/upload', uploadDocumentos.array('documentos'), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No se subieron archivos' });
    }
    res.json({ success: true, subidos: req.files.length });
});

app.get('/api/documentos-institucion', (req, res) => {
    fs.readdir(documentosInstitucionPath, (err, files) => {
        if (err) return res.status(500).json([]);

        const archivos = files.map(file => {
            const stats = fs.statSync(path.join(documentosInstitucionPath, file));
            return {
                nombre: file,
                tamaño: (stats.size / 1024).toFixed(2) + ' KB',
                fecha: stats.mtime.toLocaleDateString('es-CL')
            };
        });

        res.json(archivos);
    });
});

// Guardar contrato generado en carpeta paciente/contratos
app.post('/api/guardar-contrato', upload.single('contrato'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió el archivo' });
    }

    const pacienteId = req.body.paciente_id;
    if (!pacienteId) {
        return res.status(400).json({ error: 'ID del paciente requerido' });
    }

    db.get('SELECT nombre, sede FROM pacientes WHERE id = ?', [pacienteId], (err, p) => {
        if (err || !p) {
            console.error('Error al buscar paciente para contrato:', err);
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        const contratosPath = path.join(documentosPath, p.sede.trim(), p.nombre.trim(), 'contratos');
        fs.mkdirSync(contratosPath, { recursive: true });

        const destino = path.join(contratosPath, req.file.originalname);

        // Usar buffer en lugar de path (porque usamos memoryStorage)
        try {
            fs.writeFileSync(destino, req.file.buffer);
            console.log(`Contrato guardado correctamente: ${destino}`);
            res.json({ success: true, mensaje: 'Contrato guardado en servidor' });
        } catch (writeErr) {
            console.error('Error al escribir archivo de contrato:', writeErr);
            res.status(500).json({ error: 'Error al guardar el contrato en el servidor' });
        }
    });
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    console.log('Fotos de cédula guardadas en: public/documentos/[Sede]/[Paciente]/cedula.*');
    console.log('Usuario login por defecto: admin / evolucion2025');
});