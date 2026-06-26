// ========== DATA LAYER ==========
const Store = {
  KEY: 'permisos_aip_data',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch { return []; }
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  add(permiso) {
    const data = this.getAll();
    data.push(permiso);
    this.save(data);
    return permiso;
  },

  update(id, updates) {
    const data = this.getAll();
    const idx = data.findIndex(p => p.id === id);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...updates };
    this.save(data);
    return data[idx];
  },

  delete(id) {
    const data = this.getAll().filter(p => p.id !== id);
    this.save(data);
  },

  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
  },

  generateId() {
    return 'PER-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
  },

  getMonths() {
    return [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
  },

  getMonthName(num) {
    return this.getMonths()[num - 1] || '';
  },

  getStats() {
    const data = this.getAll();
    return {
      total: data.length,
      pendientes: data.filter(p => p.status === 'pendiente').length,
      aprobados: data.filter(p => p.status === 'aprobado').length,
      rechazados: data.filter(p => p.status === 'rechazado').length,
    };
  },

  getMonthlyData(year) {
    return this.getMonthlyDataFromList(this.getAll(), year);
  },

  getMonthlyDataFromList(data, year) {
    const months = Array(12).fill(0);
    const y = year || new Date().getFullYear();
    data.forEach(p => {
      const d = new Date(p.fechaInicio);
      if (d.getFullYear() === y) {
        months[d.getMonth()]++;
      }
    });
    return months;
  },

  getFiltered(filters) {
    let data = this.getAll();
    if (filters.grupo) data = data.filter(p => p.grupo === filters.grupo);
    if (filters.subgrupo) data = data.filter(p => p.subgrupo === filters.subgrupo);
    if (filters.estado) data = data.filter(p => p.status === filters.estado);
    if (filters.desde) data = data.filter(p => new Date(p.fechaInicio) >= new Date(filters.desde));
    if (filters.hasta) data = data.filter(p => new Date(p.fechaFin) <= new Date(filters.hasta));
    if (filters.busqueda) {
      const q = filters.busqueda.toLowerCase();
      data = data.filter(p =>
        p.empleado.toLowerCase().includes(q) ||
        p.motivo.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }
    return data;
  }
};

// ========== APP STATE ==========
const App = {
  currentUser: null, // 'empleado' | 'admin'
  currentView: null,
  editingId: null,

  init() {
    this.bindEvents();
    this.showLogin();
    this.renderAdminCharts();
  },

  // ========== AUTH ==========
  showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
    document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('btn-entrar').disabled = true;
    document.getElementById('password-field').style.display = 'none';
    document.getElementById('password-input').value = '';
    this.currentUser = null;
  },

  handleProfileSelect(el) {
    document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    this.currentUser = el.dataset.profile;
    document.getElementById('btn-entrar').disabled = false;
    const pwField = document.getElementById('password-field');
    if (this.currentUser === 'admin') {
      pwField.style.display = 'block';
      document.getElementById('password-input').focus();
    } else {
      pwField.style.display = 'none';
      document.getElementById('password-input').value = '';
    }
  },

  handleLogin() {
    if (!this.currentUser) return;
    if (this.currentUser === 'admin') {
      const pw = document.getElementById('password-input').value;
      if (pw !== 'Aippermisos') {
        this.toast('Contraseña incorrecta. Acceso denegado.', 'error');
        document.getElementById('password-input').value = '';
        document.getElementById('password-input').focus();
        return;
      }
    }
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    this.setupSidebar();
    this.navigate(this.currentUser === 'admin' ? 'dashboard' : 'form');
  },

  logout() {
    this.currentUser = null;
    this.showLogin();
  },

  // ========== SIDEBAR ==========
  setupSidebar() {
    const isAdmin = this.currentUser === 'admin';
    const userBadge = document.querySelector('.user-badge');
    userBadge.textContent = isAdmin ? 'Administrador' : 'Empleado';

    const nav = document.querySelector('.sidebar-nav');
    nav.innerHTML = '';

    if (isAdmin) {
      nav.innerHTML = `
        <button class="nav-item" data-view="dashboard"><span class="nav-icon">📊</span> Dashboard</button>
        <button class="nav-item" data-view="permisos"><span class="nav-icon">📋</span> Todos los Permisos</button>
        <button class="nav-item" data-view="reportes"><span class="nav-icon">📄</span> Reportes</button>
      `;
    } else {
      nav.innerHTML = `
        <button class="nav-item" data-view="form"><span class="nav-icon">📝</span> Solicitar Permiso</button>
        <button class="nav-item" data-view="mis-permisos"><span class="nav-icon">📋</span> Mis Permisos</button>
      `;
    }

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.navigate(item.dataset.view));
    });
  },

  // ========== NAVIGATION ==========
  navigate(view) {
    this.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (navItem) navItem.classList.add('active');

    if (view === 'dashboard') this.renderAdminDashboard();
    if (view === 'permisos') this.renderAllPermisos();
    if (view === 'reportes') this.renderReportes();
    if (view === 'form') this.resetForm();
    if (view === 'mis-permisos') this.renderMisPermisos();

    if (window.innerWidth <= 768) {
      document.querySelector('.sidebar').classList.remove('open');
      document.querySelector('.overlay').classList.remove('show');
    }
  },

  // ========== TOAST ==========
  toast(message, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = 'toast ' + type + ' show';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  },

  // ========== FORM HANDLING ==========
  resetForm() {
    const form = document.getElementById('permiso-form');
    form.reset();
    this.editingId = null;
    document.getElementById('form-title').textContent = 'Nueva Solicitud de Permiso';
    document.getElementById('form-subgrupo').disabled = true;
    document.getElementById('form-subgrupo').innerHTML = '<option value="">Seleccione un subgrupo</option>';
    document.getElementById('form-ausencia').value = '';
    document.getElementById('form-hora-group').style.display = 'none';
    document.getElementById('form-hora').value = '';
  },

  handleGrupoChange() {
    const grupo = document.getElementById('form-grupo').value;
    const subgrupo = document.getElementById('form-subgrupo');
    if (grupo === 'profesores') {
      subgrupo.disabled = false;
      subgrupo.innerHTML = `
        <option value="">Seleccione un nivel</option>
        <option value="preescolar">Preescolar</option>
        <option value="primaria">Primaria</option>
        <option value="secundaria">Secundaria</option>
        <option value="educacion fisica">Educación Física</option>
        <option value="psicologia">Psicología</option>
        <option value="learning support">Learning Support</option>
      `;
    } else {
      subgrupo.disabled = true;
      subgrupo.innerHTML = '<option value="">No aplica</option>';
    }
  },

  handleAusenciaChange() {
    const val = document.getElementById('form-ausencia').value;
    const group = document.getElementById('form-hora-group');
    const label = document.getElementById('form-hora-label');
    if (val === 'salida temprana') {
      group.style.display = 'block';
      label.textContent = 'Hora de salida *';
      document.getElementById('form-hora').required = true;
    } else if (val === 'llegada tarde') {
      group.style.display = 'block';
      label.textContent = 'Hora de llegada *';
      document.getElementById('form-hora').required = true;
    } else {
      group.style.display = 'none';
      document.getElementById('form-hora').required = false;
      document.getElementById('form-hora').value = '';
    }
  },

  handleFormSubmit(e) {
    e.preventDefault();
    const data = {
      empleado: document.getElementById('form-empleado').value.trim(),
      grupo: document.getElementById('form-grupo').value,
      subgrupo: document.getElementById('form-subgrupo').value,
      tipoPermiso: document.getElementById('form-tipo').value,
      tipoAusencia: document.getElementById('form-ausencia').value,
      hora: document.getElementById('form-hora').value || '',
      fechaInicio: document.getElementById('form-fecha-inicio').value,
      fechaFin: document.getElementById('form-fecha-fin').value,
      motivo: document.getElementById('form-motivo').value.trim(),
    };

    if (!data.empleado || !data.grupo || !data.tipoPermiso || !data.tipoAusencia || !data.fechaInicio || !data.fechaFin || !data.motivo) {
      this.toast('Por favor complete todos los campos requeridos.', 'error');
      return;
    }
    if (new Date(data.fechaFin) < new Date(data.fechaInicio)) {
      this.toast('La fecha de fin no puede ser anterior a la fecha de inicio.', 'error');
      return;
    }

    if (this.editingId) {
      Store.update(this.editingId, data);
      this.toast('Permiso actualizado exitosamente.', 'success');
    } else {
      const permiso = {
        id: Store.generateId(),
        ...data,
        status: 'pendiente',
        fechaSolicitud: new Date().toISOString().split('T')[0],
      };
      Store.add(permiso);
      this.toast('Permiso solicitado exitosamente.', 'success');
    }

    this.resetForm();
    if (this.currentUser === 'admin') {
      this.navigate('permisos');
    }
  },

  // ========== EMPLOYEE: MIS PERMISOS ==========
  renderMisPermisos() {
    const container = document.getElementById('mis-permisos-list');
    const data = Store.getAll();

    if (data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No hay permisos registrados</h3>
          <p>Utilice el formulario para solicitar un permiso.</p>
        </div>
      `;
      return;
    }

    const months = Store.getMonths();
    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Empleado</th>
              <th>Grupo</th>
              <th>Tipo</th>
              <th>Ausencia</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(p => `
              <tr>
                <td><strong>${p.id}</strong></td>
                <td>${p.empleado}</td>
                <td>${p.grupo}${p.subgrupo ? ' (' + p.subgrupo + ')' : ''}</td>
                <td>${p.tipoPermiso}</td>
                <td>${p.tipoAusencia}${p.hora ? ' ' + p.hora : ''}</td>
                <td>${p.fechaInicio}</td>
                <td>${p.fechaFin}</td>
                <td><span class="badge badge-${p.status}">${p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // ========== ADMIN: DASHBOARD ==========
  renderAdminDashboard() {
    const stats = Store.getStats();
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pendientes').textContent = stats.pendientes;
    document.getElementById('stat-aprobados').textContent = stats.aprobados;
    document.getElementById('stat-rechazados').textContent = stats.rechazados;
    this.renderAdminCharts();
  },

  renderAdminCharts() {
    const canvas = document.getElementById('chart-mensual');
    if (!canvas) return;

    const months = Store.getMonths();
    const data = Store.getMonthlyData(new Date().getFullYear());

    if (window._permisoChart) {
      window._permisoChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    window._permisoChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Permisos solicitados',
          data: data,
          backgroundColor: [
            '#0a192f', '#1e3a5f', '#2c5282', '#3b7baa',
            '#ab47bc', '#26c6da', '#ff7043', '#8d6e63',
            '#78909c', '#7c4dff', '#00bfa5', '#ff6f00'
          ],
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0 },
          }
        }
      }
    });
  },

  // ========== ADMIN: ALL PERMISOS ==========
  renderAllPermisos(filterData, containerId) {
    const data = filterData || Store.getAll();
    const container = document.getElementById(containerId || 'permisos-list');
    if (!container) return;

    const isReport = containerId === 'reporte-permisos-list';

    if (data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No hay permisos registrados</h3>
          <p>Los permisos solicitados aparecerán aquí.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Empleado</th>
              <th>Grupo</th>
              <th>Subgrupo</th>
              <th>Tipo</th>
              <th>Ausencia</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Solicitud</th>
              <th>Estado</th>
              ${isReport ? '' : '<th>Acciones</th>'}
            </tr>
          </thead>
          <tbody>
            ${data.map(p => `
              <tr>
                <td><strong>${p.id}</strong></td>
                <td>${p.empleado}</td>
                <td>${p.grupo}</td>
                <td>${p.subgrupo || '-'}</td>
                <td>${p.tipoPermiso}</td>
                <td>${p.tipoAusencia}${p.hora ? ' ' + p.hora : ''}</td>
                <td>${p.fechaInicio}</td>
                <td>${p.fechaFin}</td>
                <td>${p.fechaSolicitud}</td>
                <td>
                  <select class="status-select ${p.status}" onchange="App.handleStatusChange('${p.id}', this.value)">
                    <option value="pendiente" ${p.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="aprobado" ${p.status === 'aprobado' ? 'selected' : ''}>Aprobado</option>
                    <option value="rechazado" ${p.status === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                  </select>
                </td>
                <td>
                  ${isReport ? '' : `
                    <button class="btn btn-sm btn-secondary" onclick="App.editPermiso('${p.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deletePermiso('${p.id}')">🗑️</button>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  handleStatusChange(id, status) {
    Store.update(id, { status });
    this.toast(`Estado actualizado a "${status}".`, 'info');
  },

  editPermiso(id) {
    const p = Store.getById(id);
    if (!p) return;
    this.navigate('form');
    this.editingId = id;
    document.getElementById('form-title').textContent = 'Editar Permiso - ' + p.id;
    document.getElementById('form-empleado').value = p.empleado;
    document.getElementById('form-grupo').value = p.grupo;
    this.handleGrupoChange();
    document.getElementById('form-subgrupo').value = p.subgrupo || '';
    document.getElementById('form-tipo').value = p.tipoPermiso;
    document.getElementById('form-ausencia').value = p.tipoAusencia;
    this.handleAusenciaChange();
    document.getElementById('form-hora').value = p.hora || '';
    document.getElementById('form-fecha-inicio').value = p.fechaInicio;
    document.getElementById('form-fecha-fin').value = p.fechaFin;
    document.getElementById('form-motivo').value = p.motivo;
  },

  deletePermiso(id) {
    if (!confirm('¿Está seguro de eliminar este permiso?')) return;
    Store.delete(id);
    this.toast('Permiso eliminado.', 'success');
    this.renderAllPermisos(Store.getAll());
  },

  // ========== ADMIN: REPORTES ==========
  renderReportes() {
    const all = Store.getAll();
    document.getElementById('reporte-total').textContent = all.length;

    this.renderAllPermisos(all, 'reporte-permisos-list');

    const year = document.getElementById('filter-year')?.value || new Date().getFullYear();
    const months = Store.getMonthlyData(parseInt(year));
    const canvas = document.getElementById('chart-reporte');
    if (canvas && window._reporteChart) {
      window._reporteChart.destroy();
    }
    if (canvas) {
      const ctx = canvas.getContext('2d');
      window._reporteChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Store.getMonths(),
          datasets: [{
            label: 'Permisos',
            data: months,
            backgroundColor: '#0a192f',
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }
        }
      });
    }
  },

  applyReportFilters() {
    const filters = {
      grupo: document.getElementById('filter-grupo').value,
      subgrupo: document.getElementById('filter-subgrupo').value,
      estado: document.getElementById('filter-estado').value,
      desde: document.getElementById('filter-desde').value,
      hasta: document.getElementById('filter-hasta').value,
      busqueda: document.getElementById('filter-busqueda').value,
    };

    const data = Store.getFiltered(filters);
    document.getElementById('reporte-total').textContent = data.length;
    this.renderAllPermisos(data, 'reporte-permisos-list');

    const year = document.getElementById('filter-year')?.value || new Date().getFullYear();
    const months = Store.getMonthlyDataFromList(data, parseInt(year));
    const canvas = document.getElementById('chart-reporte');
    if (canvas && window._reporteChart) {
      window._reporteChart.destroy();
    }
    if (canvas) {
      const ctx = canvas.getContext('2d');
      window._reporteChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Store.getMonths(),
          datasets: [{
            label: 'Permisos',
            data: months,
            backgroundColor: '#0a192f',
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }
        }
      });
    }
  },

  clearReportFilters() {
    document.querySelectorAll('.filter-bar input, .filter-bar select').forEach(el => {
      if (el.id !== 'filter-year') el.value = '';
      if (el.id === 'filter-subgrupo') { el.disabled = true; el.innerHTML = '<option value="">Todos</option>'; }
    });
    this.applyReportFilters();
  },

  handleReportGrupoChange() {
    const grupo = document.getElementById('filter-grupo').value;
    const subgrupo = document.getElementById('filter-subgrupo');
    if (grupo === 'profesores') {
      subgrupo.disabled = false;
      subgrupo.innerHTML = `
        <option value="">Todos</option>
        <option value="preescolar">Preescolar</option>
        <option value="primaria">Primaria</option>
        <option value="secundaria">Secundaria</option>
        <option value="educacion fisica">Educación Física</option>
        <option value="psicologia">Psicología</option>
        <option value="learning support">Learning Support</option>
      `;
    } else {
      subgrupo.disabled = true;
      subgrupo.innerHTML = '<option value="">Todos</option>';
    }
  },

  handleReportYearChange() {
    this.applyReportFilters();
  },

  // ========== EXPORT ==========
  exportToExcel() {
    const data = Store.getAll();
    if (data.length === 0) {
      this.toast('No hay datos para exportar.', 'error');
      return;
    }

    const rows = data.map(p => ({
      Folio: p.id,
      Empleado: p.empleado,
      Grupo: p.grupo,
      Subgrupo: p.subgrupo || '',
      'Tipo Permiso': p.tipoPermiso,
      'Tipo Ausencia': p.tipoAusencia,
      Hora: p.hora || '',
      'Fecha Inicio': p.fechaInicio,
      'Fecha Fin': p.fechaFin,
      'Fecha Solicitud': p.fechaSolicitud,
      Estado: p.status,
      Motivo: p.motivo,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Permisos');
    XLSX.writeFile(wb, 'reporte-permisos-aip.xlsx');
    this.toast('Excel exportado exitosamente.', 'success');
  },

  exportToPDF() {
    const data = Store.getAll();
    if (data.length === 0) {
      this.toast('No hay datos para exportar.', 'error');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.text('Reporte de Permisos - AIP', 14, 20);
    doc.setFontSize(10);
    doc.text('Generado: ' + new Date().toLocaleDateString('es-MX'), 14, 28);

    const headers = [['Folio', 'Empleado', 'Grupo', 'Tipo', 'Ausencia', 'Inicio', 'Fin', 'Estado']];
    const body = data.map(p => [p.id, p.empleado, p.grupo + (p.subgrupo ? '/' + p.subgrupo : ''), p.tipoPermiso, p.tipoAusencia + (p.hora ? ' ' + p.hora : ''), p.fechaInicio, p.fechaFin, p.status]);

    doc.autoTable({
      head: headers,
      body: body,
      startY: 32,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 115, 232] },
    });

    doc.save('reporte-permisos-aip.pdf');
    this.toast('PDF exportado exitosamente.', 'success');
  },

  // ========== EVENTS ==========
  bindEvents() {
    document.querySelectorAll('.profile-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleProfileSelect(btn));
    });
    document.getElementById('btn-entrar').addEventListener('click', () => this.handleLogin());
    document.getElementById('btn-logout').addEventListener('click', () => this.logout());
    document.getElementById('password-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    document.getElementById('permiso-form').addEventListener('submit', (e) => this.handleFormSubmit(e));
    document.getElementById('form-grupo').addEventListener('change', () => this.handleGrupoChange());
    document.getElementById('form-ausencia').addEventListener('change', () => this.handleAusenciaChange());
    document.getElementById('btn-cancelar').addEventListener('click', () => this.resetForm());

    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
      document.querySelector('.overlay').classList.toggle('show');
    });
    document.querySelector('.overlay').addEventListener('click', () => {
      document.querySelector('.sidebar').classList.remove('open');
      document.querySelector('.overlay').classList.remove('show');
    });
  }
};

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  App.init();

  // Expose for inline onclick handlers
  window.App = App;
  window.Store = Store;
});
