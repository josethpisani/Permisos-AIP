const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// Configuración de la conexión a Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(cors());
app.use(express.json());

// Función para generar IDs
function generateId() {
    return 'PER-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

// OBTENER EMPLEADOS
// OBTENER EMPLEADOS (Integrado directamente para evitar fallos de lectura de archivos en Netlify)
app.get('/api/empleados', (req, res) => {
    try {
        const empleados = [
            { "id": 1, "nombre": "Joseth Pisani " },
            { "id": 2, "nombre": "Darrel" },
            { "id": 3, "nombre": "Tomas" }
        ];
        res.json(empleados);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener empleados' });
    }
});
});

// OBTENER TODOS LOS PERMISOS
app.get('/api/permisos', async (req, res) => {
    try {
        const result = await pool.query('SELECT datos FROM permisos_tabla');
        const registros = result.rows.map(row => row.datos);
        res.json(registros);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

// CREAR UN NUEVO PERMISO
app.post('/api/permisos', async (req, res) => {
    const permiso = {
        id: generateId(),
        ...req.body,
        status: req.body.status || 'pendiente',
        fechaSolicitud: req.body.fechaSolicitud || new Date().toISOString().split('T')[0],
    };

    try {
        await pool.query(
            'INSERT INTO permisos_tabla (id, datos) VALUES ($1, $2)',
            [permiso.id, JSON.stringify(permiso)]
        );
        res.status(201).json(permiso);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar el permiso' });
    }
});

// ACTUALIZAR UN PERMISO
app.put('/api/permisos/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT datos FROM permisos_tabla WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Permiso no encontrado' });

        const datosActuales = result.rows[0].datos;
        const datosActualizados = { ...datosActuales, ...req.body };

        await pool.query('UPDATE permisos_tabla SET datos = $1 WHERE id = $2', [JSON.stringify(datosActualizados), req.params.id]);
        res.json(datosActualizados);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar' });
    }
});

// ELIMINAR UN PERMISO
app.delete('/api/permisos/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM permisos_tabla WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Permiso no encontrado' });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

// Exportamos el handler listo para que lo lea Netlify Functions
module.exports.handler = serverless(app);
