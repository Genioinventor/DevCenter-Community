// script.js - carga desde JSONBin y genera .project-card dinámicamente

// ==================== CONFIGURACIÓN ====================
const PROJECTS_PER_SECTION = 10;
const PROJECT_LINK_TEXT = "Explorar";
const PROJECT_LINK_EMOJI = "🌐";
// ==================== CONFIGURACIÓN ====================



(async function () {
  const projectsGrid = document.getElementById('projectsGrid');
  const searchBox = document.getElementById('searchBox');
  const emptyState = document.getElementById('emptyState');

  // PAGINACIÓN
  const paginationControls = document.getElementById('paginationControls');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageIndicator = document.getElementById('pageIndicator');

  let allProjects = [];
  let filteredProjects = [];
  let currentPage = 1;
  let pageSize = PROJECTS_PER_SECTION;

  // Mapeo de estados a clases CSS
  // Solo los 11 estados que tienes en CSS
  const statusMap = {
    'activo': 'status-activo',
    'oficial': 'status-oficial',
    'community': 'status-community',
    'beta': 'status-beta',
    'stable': 'status-stable',
    'experimental': 'status-experimental',
    'premium': 'status-premium',
    'free': 'status-free',
    'demo': 'status-demo',
    'urgent': 'status-urgent',
    'archived': 'status-archived'
  };


  // FAVORITOS: helpers
  // Cache de favoritos para evitar múltiples accesos a localStorage en una misma renderización
  let favoritesCache = null;
  function getFavorites() {
    if (favoritesCache) return favoritesCache;
    try {
      favoritesCache = JSON.parse(localStorage.getItem('dc_favorites') || '[]');
      return favoritesCache;
    } catch { favoritesCache = []; return favoritesCache; }
  }
  function setFavorites(favs) {
    favoritesCache = favs;
    localStorage.setItem('dc_favorites', JSON.stringify(favs));
  }
  function isFavorite(project) {
    const favs = getFavorites();
    return favs.some(f => f.url === project.url);
  }
  function toggleFavorite(project) {
    let favs = getFavorites();
    if (isFavorite(project)) {
      favs = favs.filter(f => f.url !== project.url);
    } else {
      favs.push({ url: project.url, title: project.title, initials: project.initials, status: project.status, tags: project.tags });
    }
    setFavorites(favs);
    renderFavoritesSection();
  }

  // Render favoritos en la sección principal
  function renderFavoritesSection() {
    const favSection = document.getElementById('favoritesSection');
    const favGrid = document.getElementById('favoritesGrid');
    const favs = getFavorites();
    if (!favSection || !favGrid) return;
    if (favGrid.childElementCount === favs.length && favs.length > 0) return;
    favGrid.innerHTML = '';
    if (!favs.length) {
      favSection.style.display = 'none';
      return;
    }
    favSection.style.display = 'block';

    favs.forEach(fav => {
      const fullProject = allProjects.find(p => p.url === fav.url) || fav;

      const card = document.createElement('div');
      card.className = 'project-card';
      card.setAttribute('data-tags', (fullProject.tags || []).join(' '));

      const header = document.createElement('div');
      header.className = 'project-header';

      const icon = document.createElement('div');
      icon.className = 'project-icon';
      icon.textContent = fullProject.initials || (fullProject.title || '').slice(0, 2).toUpperCase();

      const titleWrap = document.createElement('div');
      titleWrap.className = 'project-title';

      const h3 = document.createElement('h3');
      h3.style.display = 'flex';
      h3.style.alignItems = 'center';
      h3.style.gap = '8px';
      h3.textContent = fullProject.title || 'Sin título';

      // Botón Favoritos (estrella grande)
      const favBtn = document.createElement('button');
      favBtn.className = 'fav-btn';
      favBtn.title = 'Quitar de Favoritos';
      favBtn.style.background = 'none';
      favBtn.style.border = 'none';
      favBtn.style.cursor = 'pointer';
      favBtn.style.padding = '0';
      favBtn.style.marginLeft = '6px';
      favBtn.innerHTML = `<span style="font-size:2rem;color:#facc15;">&#9733;</span>`;
      favBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite(fullProject);
        renderProjects(filteredProjects);
      };

      h3.appendChild(favBtn);

      // Badge de status igual que en createCard
      const badge = document.createElement('span');
      badge.className = 'status-badge';
      const status = (fullProject.status || '').toLowerCase();
      const statusClass = statusMap[status] || 'status-new';
      badge.classList.add(statusClass);
      badge.textContent = (status || 'unknown').toUpperCase();

      titleWrap.appendChild(h3);
      titleWrap.appendChild(badge);

      header.appendChild(icon);
      header.appendChild(titleWrap);

      const link = document.createElement('a');
      link.className = 'project-link';
      link.href = '#';
      link.innerHTML = `${PROJECT_LINK_TEXT} <span>${PROJECT_LINK_EMOJI}</span>`;

      card.appendChild(header);
      card.appendChild(link);

      // Al hacer click en la tarjeta o en el link, abre el panel de información con toda la info
      card.addEventListener('click', function (e) {
        if (e.target.closest('.fav-btn')) return;
        showProjectPanel(fullProject);
      });
      link.addEventListener('click', function (e) {
        e.preventDefault();
        showProjectPanel(fullProject);
      });

      favGrid.appendChild(card);
    });
  }

  // Delegación de eventos para favoritos en el grid principal
  projectsGrid.addEventListener('click', function (e) {
    const favBtn = e.target.closest('.fav-btn');
    if (favBtn) {
      e.stopPropagation();
      e.preventDefault();
      const card = favBtn.closest('.project-card');
      if (!card) return;
      const title = card.querySelector('h3')?.childNodes[0]?.nodeValue || '';
      const url = card.querySelector('a.project-link')?.href || '';
      const initials = card.querySelector('.project-icon')?.textContent || '';
      const status = card.querySelector('.status-badge')?.textContent || '';
      const tags = (card.getAttribute('data-tags') || '').split(' ').filter(Boolean);
      toggleFavorite({ url, title, initials, status, tags });
      renderProjects(filteredProjects);
      return;
    }
    // Delegación para abrir panel
    const card = e.target.closest('.project-card');
    if (card && !e.target.closest('.fav-btn')) {
      const url = card.querySelector('a.project-link')?.href || '';
      const project = allProjects.find(p => p.url === url);
      if (project) showProjectPanel(project);
    }
  });

  function createCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('data-tags', (project.tags || []).join(' '));

    const header = document.createElement('div');
    header.className = 'project-header';

    const icon = document.createElement('div');
    icon.className = 'project-icon';
    icon.textContent = project.initials || (project.title || '').slice(0, 2).toUpperCase();

    const titleWrap = document.createElement('div');
    titleWrap.className = 'project-title';

    const h3 = document.createElement('h3');
    h3.style.display = 'flex';
    h3.style.alignItems = 'center';
    h3.style.gap = '8px';
    h3.textContent = project.title || 'Sin título';

    // Botón Favoritos en la tarjeta (estrella grande)
    const favBtn = document.createElement('button');
    favBtn.className = 'fav-btn';
    favBtn.title = isFavorite(project) ? 'Quitar de Favoritos' : 'Añadir a Favoritos';
    favBtn.style.background = 'none';
    favBtn.style.border = 'none';
    favBtn.style.cursor = 'pointer';
    favBtn.style.padding = '0';
    favBtn.style.marginLeft = '6px';
    favBtn.innerHTML = `<span style="font-size:2rem;color:#facc15;">${isFavorite(project) ? '&#9733;' : '&#9734;'}</span>`;
    favBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleFavorite(project);
      renderProjects(filteredProjects);
    };

    h3.appendChild(favBtn);

    const badge = document.createElement('span');
    badge.className = 'status-badge';

    const status = (project.status || '').toLowerCase();
    const statusClass = statusMap[status] || 'status-new';
    badge.classList.add(statusClass);
    badge.textContent = (status || 'unknown').toUpperCase();

    titleWrap.appendChild(h3);
    titleWrap.appendChild(badge);

    header.appendChild(icon);
    header.appendChild(titleWrap);

    const link = document.createElement('a');
    link.className = 'project-link';
    link.href = project.url || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.innerHTML = `${PROJECT_LINK_TEXT} <span>${PROJECT_LINK_EMOJI}</span>`;

    card.appendChild(header);
    card.appendChild(link);

    return card;
  }

  function renderProjects(projects) {
    filteredProjects = projects || [];
    const favs = getFavorites();
    const favUrls = favs.map(f => f.url);
    const nonFavProjects = filteredProjects.filter(p => !favUrls.includes(p.url));

    const total = nonFavProjects.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageProjects = nonFavProjects.slice(start, end);

    if (projectsGrid.childElementCount === pageProjects.length && pageProjects.length > 0) return;

    projectsGrid.innerHTML = '';
    if (!pageProjects || pageProjects.length === 0) {
      emptyState.style.display = 'block';
      updatePaginationIndicator();
      renderFavoritesSection();
      return;
    } else {
      emptyState.style.display = 'none';
    }
    pageProjects.forEach((p, i) => {
      const card = createCard(p);
      card.style.animationDelay = `${i * 0.08}s`;
      projectsGrid.appendChild(card);
    });
    updatePaginationIndicator();
    renderFavoritesSection();
  }

  function updatePaginationIndicator() {
    const total = filteredProjects.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  function goToPage(page) {
    const total = filteredProjects.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    currentPage = Math.max(1, Math.min(page, totalPages));
    renderProjects(filteredProjects);
  }

  prevPageBtn?.addEventListener('click', () => goToPage(currentPage - 1));
  nextPageBtn?.addEventListener('click', () => goToPage(currentPage + 1));
  // Elimina el eventListener de pageSizeInput

  function applySearchFilter(term) {
    const searchTerm = (term || '').toLowerCase().trim();
    let visibleCount = 0;

    // Filtra los proyectos en memoria, no los DOM
    let filtered = allProjects.filter(project => {
      const title = (project.title || '').toLowerCase();
      const tags = (project.tags || []).map(t => t.toLowerCase());
      const status = (project.status || '').toLowerCase();
      const initials = (project.initials || (project.title || '').slice(0, 2)).toLowerCase();

      return (
        title.startsWith(searchTerm) ||
        title.includes(searchTerm) ||
        tags.some(tag => tag.startsWith(searchTerm)) ||
        tags.some(tag => tag.includes(searchTerm)) ||
        status.includes(searchTerm) ||
        initials.startsWith(searchTerm) ||
        initials.includes(searchTerm)
      );
    });

    visibleCount = filtered.length;
    currentPage = 1;
    renderProjects(filtered);
    emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
  }

  // SearchBox
  if (searchBox) {
    // Debounce para evitar búsquedas excesivas
    let searchTimeout;
    searchBox.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const value = e.target.value;
      searchTimeout = setTimeout(() => applySearchFilter(value), 120);
    });
  }

  // 🚀 Fetch JSON desde JSONBin
  try {
    const resp = await fetch("https://api.jsonbin.io/v3/b/68af329cae596e708fd92637/latest", {
      cache: "no-store"
      // headers: { "X-Master-Key": "TU_API_KEY" } // opcional si lo quieres privado
    });
    if (!resp.ok) throw new Error('No se pudo obtener JSON desde JSONBin');
    const data = await resp.json();
    allProjects = data.record.projects || [];
    filteredProjects = allProjects;
    currentPage = 1;
    renderProjects(allProjects);
  } catch (err) {
    console.error('Error cargando proyectos:', err);
    emptyState.style.display = 'block';
    filteredProjects = [];
    updatePaginationIndicator();
  }

  // PANEL FAVORITOS
  const panelFavBtn = document.getElementById('panelFavBtn');
  const panelFavIcon = document.getElementById('panelFavIcon');
  const panelTitleText = document.getElementById('panelTitleText');
  let lastPanelProject = null;

  // Actualiza el botón de favoritos del panel
  function updatePanelFavBtn(project) {
    if (!panelFavBtn || !panelFavIcon) return;
    if (isFavorite(project)) {
      panelFavIcon.innerHTML = '&#9733;';
      panelFavBtn.title = 'Quitar de Favoritos';
    } else {
      panelFavIcon.innerHTML = '&#9734;';
      panelFavBtn.title = 'Añadir a Favoritos';
    }
  }

  // Modifica showProjectPanel para manejar favoritos
  function showProjectPanel(project) {
    lastPanelProject = project;
    panelTitleText.textContent = project.title || 'Proyecto';
    panelDescription.textContent = project.description || 'Sin descripción disponible.';
    panelVisit.href = project.url || '#';
    panelVisit.setAttribute('target', '_blank');
    panelInitials.textContent = (project.initials || (project.title || '').slice(0, 2)).toUpperCase();
    panelDate.textContent = project.dateAdded ? new Date(project.dateAdded).toLocaleString() : '—';

    // tags
    panelTags.innerHTML = '';
    const tags = Array.isArray(project.tags) ? project.tags : (project.tags ? String(project.tags).split(',').map(t => t.trim()).filter(Boolean) : []);
    if (tags.length) {
      tags.forEach(t => {
        const el = document.createElement('span');
        el.className = 'tag-chip';
        el.textContent = t;
        panelTags.appendChild(el);
      });
    } else {
      const el = document.createElement('span');
      el.className = 'tag-chip';
      el.textContent = 'Sin tags';
      panelTags.appendChild(el);
    }

    panel.classList.remove('hide');
    panel.classList.add('show');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    updatePanelFavBtn(project);

    setTimeout(() => panelVisit.focus(), 160);
  }

  // Botón favoritos del panel
  if (panelFavBtn) {
    panelFavBtn.onclick = function () {
      if (!lastPanelProject) return;
      toggleFavorite(lastPanelProject);
      updatePanelFavBtn(lastPanelProject);
      renderProjects(filteredProjects);
    };
  }

  // Inicializa favoritos al cargar
  renderFavoritesSection();

  // Limpia cache de favoritos al cambiar de pestaña
  window.addEventListener('storage', (e) => {
    if (e.key === 'dc_favorites') favoritesCache = null;
  });

})();
