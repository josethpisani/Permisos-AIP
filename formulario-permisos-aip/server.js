const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function generateId() {
  return 'PER-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

app.get('/api/empleados', (req, res) => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'empleados.json'), 'utf8');
    res.json(JSON.parse(raw));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

app.get('/api/permisos', async (req, res) => {
  try {
    const result = await pool.query('SELECT datos FROM permisos_tabla');
    res.json(result.rows.map(row => row.datos));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

app.post('/api/permisos', async (req, res) => {
  const permiso = {
    id: generateId(),
    ...req.body,
    status: req.body.status || 'pendiente',
    fechaSolicitud: req.body.fechaSolicitud || new Date().toISOString().split('T')[0],
  };
  try {
    await pool.query('INSERT INTO permisos_tabla (id, datos) VALUES ($1, $2)', [permiso.id, JSON.stringify(permiso)]);
    res.status(201).json(permiso);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar el permiso' });
  }
});

app.put('/api/permisos/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT datos FROM permisos_tabla WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Permiso no encontrado' });
    const datosActualizados = { ...result.rows[0].datos, ...req.body };
    await pool.query('UPDATE permisos_tabla SET datos = $1 WHERE id = $2', [JSON.stringify(datosActualizados), req.params.id]);
    res.json(datosActualizados);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

app.delete('/api/permisos/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM permisos_tabla WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Permiso no encontrado' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// Para Vercel: exportamos la app directamente
module.exports = app;

// Para desarrollo local: iniciamos el servidor
if (require.main === module) {
  const PORT = process.env.PORT || 8012;
  app.listen(PORT, () => {
    console.log('Servidor corriendo en http://localhost:' + PORT);
  });
}
