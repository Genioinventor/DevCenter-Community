// script.js - carga desde JSONBin y genera .project-card dinámicamente

// ==================== CONFIGURACIÓN ====================
const PROJECTS_PER_SECTION = 10;
const PROJECT_LINK_TEXT = "Explorar";
const PROJECT_LINK_EMOJI = "🌐";
const REVIEWS_BIN_ID = '68d839ed43b1c97be9523e04'; // Bin ID para comentarios y reseñas

// ==================== ORDENAMIENTO POR POPULARIDAD ====================
const POPULARITY_SORT_ENABLED = true; // Por defecto habilitado
const POP_MIN_VOTES = 8; // Mínimo de votos para el cálculo bayesiano
const POP_REVIEW_BONUS_K = 0.1; // Factor de bonificación por número de reseñas
const POP_FALLBACK_MEAN = 3.5; // Promedio por defecto si no hay reseñas globales

// ==================== PROYECTOS PROMOCIONALES ====================
const ENABLE_PROMOTED_SECTION = true; // Cambiar a false para desactivar
let promo = "PROMOCIÓN"; // Cambiar el texto de la promocion 
// Solo nombres de proyectos que ya existen en JSONBin
const PROMOTED_PROJECT_NAMES = [
  "DevCenter Code"

];
// ==================== CONFIGURACIÓN ====================
window.REVIEWS_BIN_ID = REVIEWS_BIN_ID;


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
  let allReviews = []; // Almacena todos los comentarios y reseñas
  
  // Cache de popularidad y configuración
  let popularityCache = new Map(); // Almacena {title: {avg, count, score}}
  let globalMean = POP_FALLBACK_MEAN; // Promedio global calculado
  let isPopularitySortEnabled = POPULARITY_SORT_ENABLED;

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

  // FUNCIONES PARA RESEÑAS Y COMENTARIOS
  async function loadReviews() {
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${REVIEWS_BIN_ID}/latest`, {
        cache: "no-store"
      });
      if (!response.ok) throw new Error('No se pudo cargar las reseñas');
      const data = await response.json();
      allReviews = data.record.comentarios || [];
      return allReviews;
    } catch (error) {
      console.error('Error cargando reseñas:', error);
      return [];
    }
  }

  function getProjectReviews(projectTitle) {
    return allReviews.filter(review => 
      review.proyecto && review.proyecto.toLowerCase() === projectTitle.toLowerCase()
    );
  }

  function calculateAverageRating(projectTitle) {
    const reviews = getProjectReviews(projectTitle);
    if (reviews.length === 0) return 0;
    
    const sum = reviews.reduce((total, review) => total + (review.estrellas || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10; // Redondear a 1 decimal
  }

  function generateStarsHTML(rating) {
    let starsHTML = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<span class="star-filled">★</span>';
    }
    
    if (hasHalfStar) {
      starsHTML += '<span class="star-half">★</span>';
    }
    
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<span class="star-empty">☆</span>';
    }
    
    return starsHTML;
  }

  // ==================== FUNCIONES DE POPULARIDAD ====================
  
  // Calcula la puntuación de popularidad usando promedio bayesiano
  function computePopularityScore(avg, count) {
    const C = globalMean || POP_FALLBACK_MEAN;
    const m = POP_MIN_VOTES;
    const k = POP_REVIEW_BONUS_K;
    
    // Promedio bayesiano + bonificación logarítmica por número de reseñas
    const bayesianAvg = (count / (count + m)) * avg + (m / (count + m)) * C;
    const reviewBonus = k * Math.log(1 + count);
    
    return bayesianAvg + reviewBonus;
  }
  
  // Obtiene información de popularidad para un proyecto
  function getPopularityInfo(title) {
    return popularityCache.get(title) || { avg: 0, count: 0, score: 0 };
  }
  
  // Construye el cache de popularidad para todos los proyectos
  function buildPopularityCache() {
    popularityCache.clear();
    
    // Calcular promedio global de todas las reseñas
    let totalRating = 0;
    let totalCount = 0;
    
    allReviews.forEach(review => {
      if (review.estrellas && review.estrellas > 0) {
        totalRating += review.estrellas;
        totalCount++;
      }
    });
    
    globalMean = totalCount > 0 ? totalRating / totalCount : POP_FALLBACK_MEAN;
    
    // Construir cache para cada proyecto
    allProjects.forEach(project => {
      const title = project.title;
      const avg = calculateAverageRating(title);
      const count = getProjectReviews(title).length;
      const score = computePopularityScore(avg, count);
      
      popularityCache.set(title, { avg, count, score });
    });
    
    console.log('[Popularidad] Cache construido: ' + popularityCache.size + ' proyectos, promedio global: ' + globalMean.toFixed(2));
  }
  
  // Verifica si el ordenamiento por popularidad está habilitado
  function isPopularitySortEnabledCheck() {
    // Verificar localStorage, si no existe usar el valor por defecto
    const stored = localStorage.getItem('dc_sort_popularity');
    if (stored !== null) {
      isPopularitySortEnabled = stored === 'true';
    }
    return isPopularitySortEnabled;
  }
  
  // Ordena proyectos por popularidad si está habilitado
  function sortProjectsByPopularity(projects) {
    if (!isPopularitySortEnabledCheck()) {
      return projects; // Sin ordenar si está deshabilitado
    }
    
    return projects.sort((a, b) => {
      const infoA = getPopularityInfo(a.title);
      const infoB = getPopularityInfo(b.title);
      
      // Ordenar por puntuación de popularidad (descendente)
      if (infoA.score !== infoB.score) {
        return infoB.score - infoA.score;
      }
      
      // Desempate por rating promedio (descendente)
      if (infoA.avg !== infoB.avg) {
        return infoB.avg - infoA.avg;
      }
      
      // Desempate por número de reseñas (descendente)
      if (infoA.count !== infoB.count) {
        return infoB.count - infoA.count;
      }
      
      // Desempate final por título (ascendente) para orden determinístico
      return a.title.localeCompare(b.title);
    });
  }

  // ==================== FUNCIONES PROMOCIONALES ====================
  
  // Añadir estilos CSS para promociones dinámicamente
  function addPromotionalStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .promoted-section {
        margin: 40px auto 50px;
        max-width: 1400px;
        position: relative;
      }
      
      .promoted-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        margin-bottom: 25px;
        position: relative;
      }
      
      .promoted-header h2 {
        font-size: 2rem;
        font-weight: 700;
        background: linear-gradient(135deg, #ff6b6b, #feca57, #ff9ff3, #54a0ff);
        background-size: 300% 300%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: gradientShift 3s ease-in-out infinite;
        margin: 0;
      }
      
      .promoted-label {
        background: linear-gradient(45deg, #ff416c, #ff4b2b);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 1px;
        text-transform: uppercase;
        box-shadow: 0 4px 15px rgba(255, 65, 108, 0.4);
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      .promoted-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 25px;
        position: relative;
      }
      
      .promoted-card {
        background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 155, 243, 0.1));
        backdrop-filter: blur(20px);
        border: 2px solid transparent;
        background-clip: padding-box;
        position: relative;
        border-radius: 24px;
        padding: 35px;
        overflow: hidden;
        animation: fadeInUp 0.8s ease-out;
        transition: all 0.4s ease;
      }
      
      .promoted-card::before {
        content: '';
        position: absolute;
        inset: 0;
        padding: 2px;
        background: linear-gradient(45deg, #ff6b6b, #feca57, #ff9ff3, #54a0ff);
        border-radius: 24px;
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask-composite: exclude;
        animation: borderGlow 3s linear infinite;
      }
      
      @keyframes borderGlow {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      
      .promoted-card:hover {
        transform: translateY(-10px) scale(1.02);
        box-shadow: 0 40px 80px rgba(255, 107, 107, 0.3);
      }
      
      .promoted-ribbon {
        position: absolute;
        top: 20px;
        right: -10px;
        background: linear-gradient(45deg, #ff4757, #ff3742);
        color: white;
        padding: 8px 25px;
        font-size: 0.8rem;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
        transform: rotate(10deg);
        box-shadow: 0 4px 10px rgba(255, 71, 87, 0.4);
        z-index: 10;
      }
      
      .promoted-card .project-header {
        position: relative;
        z-index: 5;
      }
      
      .promoted-card .project-icon {
        background: linear-gradient(135deg, #ff6b6b, #ff4757);
        box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
      }
      
      .promoted-card .project-title h3 {
        color: #ffffff;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      .promoted-card .project-link {
        background: linear-gradient(135deg, #ff6b6b, #ff4757);
        box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
        transition: all 0.3s ease;
      }
      
      .promoted-card .project-link:hover {
        transform: scale(1.1);
        box-shadow: 0 12px 35px rgba(255, 107, 107, 0.6);
      }
    `;
    document.head.appendChild(style);
  }
  
  // Crear tarjeta promocional
  function createPromotedCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card promoted-card';
    card.setAttribute('data-tags', (project.tags || []).join(' '));

    // Ribbon promocional
    
    const ribbon = document.createElement('div');
    ribbon.className = 'promoted-ribbon';
    ribbon.textContent = `${promo}`;
   


    
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

    // Botón Favoritos en tarjeta promocional
    const favBtn = document.createElement('button');
    favBtn.className = 'fav-btn';
    favBtn.title = isFavorite(project) ? 'Quitar de Favoritos' : 'Añadir a Favoritos';
    favBtn.style.background = 'none';
    favBtn.style.border = 'none';
    favBtn.style.cursor = 'pointer';
    favBtn.style.padding = '0';
    favBtn.style.marginLeft = '6px';
    favBtn.innerHTML = '<span style="font-size:2rem;color:#facc15;">' + (isFavorite(project) ? '&#9733;' : '&#9734;') + '</span>';
    favBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleFavorite(project);
      renderPromotedSection(); // Re-renderizar promocionales
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

    // Agregar calificación con estrellas en promocionales
    const rating = calculateAverageRating(project.title);
    const reviewCount = getProjectReviews(project.title).length;
    
    if (rating > 0 || reviewCount > 0) {
      const ratingDiv = document.createElement('div');
      ratingDiv.className = 'project-rating';
      
      const starsContainer = document.createElement('div');
      starsContainer.className = 'stars-container';
      starsContainer.innerHTML = generateStarsHTML(rating);
      
      const ratingText = document.createElement('span');
      ratingText.className = 'rating-text';
      ratingText.textContent = rating > 0 ? rating + ' (' + reviewCount + ' reseña' + (reviewCount !== 1 ? 's' : '') + ')' : reviewCount + ' reseña' + (reviewCount !== 1 ? 's' : '');
      
      ratingDiv.appendChild(starsContainer);
      ratingDiv.appendChild(ratingText);
      titleWrap.appendChild(ratingDiv);
    }

    header.appendChild(icon);
    header.appendChild(titleWrap);

    const link = document.createElement('a');
    link.className = 'project-link';
    link.href = '#';
    link.innerHTML = PROJECT_LINK_TEXT + ' <span>' + PROJECT_LINK_EMOJI + '</span>';

    // Al hacer click en la tarjeta o en el link, abre el panel de información
    card.addEventListener('click', function (e) {
      if (e.target.closest('.fav-btn')) return;
      showProjectPanel(project);
    });
    link.addEventListener('click', function (e) {
      e.preventDefault();
      showProjectPanel(project);
    });

    card.appendChild(ribbon);
    card.appendChild(header);
    card.appendChild(link);

    return card;
  }
  
  // Renderizar sección promocional
  function renderPromotedSection() {
    // Si la sección promocional está desactivada, ocultar y salir
    if (!ENABLE_PROMOTED_SECTION) {
      let promotedSection = document.getElementById('promotedSection');
      if (promotedSection) {
        promotedSection.style.display = 'none';
      }
      return;
    }
    
    // Buscar o crear sección promocional
    let promotedSection = document.getElementById('promotedSection');
    
    if (!promotedSection) {
      promotedSection = document.createElement('div');
      promotedSection.id = 'promotedSection';
      promotedSection.className = 'promoted-section';
      
      // Insertar después del search-container
      const searchContainer = document.querySelector('.search-container');
      if (searchContainer && searchContainer.parentNode) {
        searchContainer.parentNode.insertBefore(promotedSection, searchContainer.nextSibling);
      }
    }
    
    // Limpiar contenido
    promotedSection.innerHTML = '';
    
    // Buscar proyectos promocionales en allProjects
    const promotedProjects = allProjects.filter(project => 
      PROMOTED_PROJECT_NAMES.includes(project.title)
    );
    
    if (promotedProjects.length === 0) {
      promotedSection.style.display = 'none';
      return;
    }
    
    promotedSection.style.display = 'block';
    
    
    // Crear grid
    const grid = document.createElement('div');
    grid.className = 'promoted-grid';
    
    promotedProjects.forEach((project, i) => {
      const card = createPromotedCard(project);
      card.style.animationDelay = (i * 0.1) + 's';
      grid.appendChild(card);
    });
    
    promotedSection.appendChild(grid);
    
    console.log('[Promocional] Sección renderizada con ' + promotedProjects.length + ' proyecto(s)');
  }

  // Función eliminada para evitar XSS - usar reviews-handler.js para el panel


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
      favBtn.innerHTML = '<span style="font-size:2rem;color:#facc15;">&#9733;</span>';
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

      // Agregar calificación con estrellas en favoritos
      const rating = calculateAverageRating(fullProject.title);
      const reviewCount = getProjectReviews(fullProject.title).length;
      
      if (rating > 0 || reviewCount > 0) {
        const ratingDiv = document.createElement('div');
        ratingDiv.className = 'project-rating';
        
        const starsContainer = document.createElement('div');
        starsContainer.className = 'stars-container';
        starsContainer.innerHTML = generateStarsHTML(rating);
        
        const ratingText = document.createElement('span');
        ratingText.className = 'rating-text';
        ratingText.textContent = rating > 0 ? rating + ' (' + reviewCount + ' reseña' + (reviewCount !== 1 ? 's' : '') + ')' : reviewCount + ' reseña' + (reviewCount !== 1 ? 's' : '');
        
        ratingDiv.appendChild(starsContainer);
        ratingDiv.appendChild(ratingText);
        titleWrap.appendChild(ratingDiv);
      }

      header.appendChild(icon);
      header.appendChild(titleWrap);

      const link = document.createElement('a');
      link.className = 'project-link';
      link.href = '#';
      link.innerHTML = PROJECT_LINK_TEXT + ' <span>' + PROJECT_LINK_EMOJI + '</span>';

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
    favBtn.innerHTML = '<span style="font-size:2rem;color:#facc15;">' + (isFavorite(project) ? '&#9733;' : '&#9734;') + '</span>';
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

    // Agregar calificación con estrellas
    const rating = calculateAverageRating(project.title);
    const reviewCount = getProjectReviews(project.title).length;
    
    if (rating > 0 || reviewCount > 0) {
      const ratingDiv = document.createElement('div');
      ratingDiv.className = 'project-rating';
      
      const starsContainer = document.createElement('div');
      starsContainer.className = 'stars-container';
      starsContainer.innerHTML = generateStarsHTML(rating);
      
      const ratingText = document.createElement('span');
      ratingText.className = 'rating-text';
      ratingText.textContent = rating > 0 ? rating + ' (' + reviewCount + ' reseña' + (reviewCount !== 1 ? 's' : '') + ')' : reviewCount + ' reseña' + (reviewCount !== 1 ? 's' : '');
      
      ratingDiv.appendChild(starsContainer);
      ratingDiv.appendChild(ratingText);
      titleWrap.appendChild(ratingDiv);
    }

    header.appendChild(icon);
    header.appendChild(titleWrap);

    const link = document.createElement('a');
    link.className = 'project-link';
    link.href = '#';
    link.innerHTML = PROJECT_LINK_TEXT + ' <span>' + PROJECT_LINK_EMOJI + '</span>';

    // Al hacer click en el link, abre el panel de información
    link.addEventListener('click', function (e) {
      e.preventDefault();
      showProjectPanel(project);
    });

    card.appendChild(header);
    card.appendChild(link);

    return card;
  }

  function renderProjects(projects) {
    filteredProjects = projects || [];
    const favs = getFavorites();
    const favUrls = favs.map(f => f.url);
    // Filtrar favoritos y proyectos promocionales (solo si la sección promocional está activa)
    const nonFavProjects = filteredProjects.filter(p => 
      !favUrls.includes(p.url) && (!ENABLE_PROMOTED_SECTION || !PROMOTED_PROJECT_NAMES.includes(p.title))
    );

    const total = nonFavProjects.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageProjects = nonFavProjects.slice(start, end);

    // Removed problematic check that prevented proper pagination with small page sizes

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
      card.style.animationDelay = (i * 0.08) + 's';
      projectsGrid.appendChild(card);
    });
    updatePaginationIndicator();
    renderFavoritesSection();
  }

  function updatePaginationIndicator() {
    const favs = getFavorites();
    const favUrls = favs.map(f => f.url);
    const nonFavProjects = filteredProjects.filter(p => 
      !favUrls.includes(p.url) && (!ENABLE_PROMOTED_SECTION || !PROMOTED_PROJECT_NAMES.includes(p.title))
    );
    const total = nonFavProjects.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    pageIndicator.textContent = 'Página ' + currentPage + ' de ' + totalPages;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  function goToPage(page) {
    const favs = getFavorites();
    const favUrls = favs.map(f => f.url);
    const nonFavProjects = filteredProjects.filter(p => 
      !favUrls.includes(p.url) && (!ENABLE_PROMOTED_SECTION || !PROMOTED_PROJECT_NAMES.includes(p.title))
    );
    const total = nonFavProjects.length;
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

    // Aplicar ordenamiento por popularidad si está habilitado
    filtered = sortProjectsByPopularity(filtered);
    
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

  // 🚀 Fetch JSON desde JSONBin - Proyectos y Reseñas
  try {
    // Cargar reseñas PRIMERO para que estén disponibles para el cálculo de ratings
    allReviews = await loadReviews();
    console.log('[Reviews] Reseñas cargadas:', allReviews.length);
    
    // Luego cargar proyectos
    const projectsResp = await fetch("https://api.jsonbin.io/v3/b/68af329cae596e708fd92637/latest", {
      cache: "no-store"
    });
    
    if (!projectsResp.ok) throw new Error('No se pudo obtener JSON desde JSONBin');
    const projectsData = await projectsResp.json();
    allProjects = projectsData.record.projects || [];
    
    // Construir cache de popularidad después de cargar proyectos y reseñas
    buildPopularityCache();
    
    // Inicializar sección promocional
    addPromotionalStyles();
    renderPromotedSection();
    
    filteredProjects = sortProjectsByPopularity([...allProjects]); // Aplicar ordenamiento inicial
    currentPage = 1;
    renderProjects(filteredProjects);
  } catch (err) {
    console.error('Error cargando datos:', err);
    emptyState.style.display = 'block';
    filteredProjects = [];
    updatePaginationIndicator();
  }

  // PANEL FAVORITOS - Obtener elementos cuando estén disponibles
  function getPanelElements() {
    return {
      panel: document.getElementById('projectPanel'),
      panelFavBtn: document.getElementById('panelFavBtn'),
      panelFavIcon: document.getElementById('panelFavIcon'),
      panelTitleText: document.getElementById('panelTitleText'),
      panelDescription: document.getElementById('panelDescription'),
      panelVisit: document.getElementById('panelVisit'),
      panelInitials: document.getElementById('panelInitials'),
      panelDate: document.getElementById('panelDate'),
      panelTags: document.getElementById('panelTags')
    };
  }
  let lastPanelProject = null;

  // Actualiza el botón de favoritos del panel
  function updatePanelFavBtn(project) {
    const elements = getPanelElements();
    if (!elements.panelFavBtn || !elements.panelFavIcon) return;
    if (isFavorite(project)) {
      elements.panelFavIcon.innerHTML = '&#9733;';
      elements.panelFavBtn.title = 'Quitar de Favoritos';
    } else {
      elements.panelFavIcon.innerHTML = '&#9734;';
      elements.panelFavBtn.title = 'Añadir a Favoritos';
    }
  }

  // Modifica showProjectPanel para manejar favoritos y reseñas
  function showProjectPanel(project) {
    lastPanelProject = project;
    
    // Acceder a los elementos directamente cada vez con pequeño delay
    setTimeout(() => {
      const panel = document.getElementById('projectPanel');
      const panelTitleText = document.getElementById('panelTitleText');
      const panelDescription = document.getElementById('panelDescription');
      const panelVisit = document.getElementById('panelVisit');
      const panelInitials = document.getElementById('panelInitials');
      const panelDate = document.getElementById('panelDate');
      const panelTags = document.getElementById('panelTags');
      
      if (panelTitleText) {
        panelTitleText.textContent = project.title || 'Proyecto';
      }
      
      if (panelDescription) {
        panelDescription.textContent = project.description || 'Sin descripción disponible.';
      }
      
      if (panelVisit) {
        panelVisit.href = project.url || '#';
        panelVisit.setAttribute('target', '_blank');
      }
      
      if (panelInitials) {
        panelInitials.textContent = (project.initials || (project.title || '').slice(0, 2)).toUpperCase();
      }
      
      if (panelDate) {
        panelDate.textContent = project.dateAdded ? new Date(project.dateAdded).toLocaleString() : '—';
      }

      // tags
      if (panelTags) {
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
      }

      if (panel) {
        panel.style.display = 'flex';
        panel.classList.remove('hide');
        panel.classList.add('show');
        panel.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }

      updatePanelFavBtn(project);

      // Agregar reseñas al panel
      if (typeof window.addReviewsToPanel === 'function') {
        setTimeout(() => {
          window.addReviewsToPanel(project.title);
        }, 100);
      }

      setTimeout(() => {
        if (panelVisit) {
          panelVisit.focus();
        }
      }, 160);
    }, 50);
  }

  // Función para cerrar el panel
  function hideProjectPanel() {
    const elements = getPanelElements();
    if (!elements.panel) return;
    elements.panel.classList.remove('show');
    elements.panel.classList.add('hide');
    elements.panel.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Después de la animación, ocultar completamente
    setTimeout(() => {
      if (elements.panel) {
        elements.panel.style.display = 'none';
        elements.panel.classList.remove('hide');
      }
    }, 200);
  }

  // Configurar eventos del panel
  const elements = getPanelElements();
  
  // Botón favoritos del panel
  if (elements.panelFavBtn) {
    elements.panelFavBtn.onclick = function () {
      if (!lastPanelProject) return;
      toggleFavorite(lastPanelProject);
      updatePanelFavBtn(lastPanelProject);
      renderProjects(filteredProjects);
    };
  }

  // Botón cerrar panel
  const panelClose = document.getElementById('panelClose');
  if (panelClose) {
    panelClose.onclick = hideProjectPanel;
  }

  // Cerrar panel con tecla Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && elements.panel && elements.panel.classList.contains('show')) {
      hideProjectPanel();
    }
  });

  // Cerrar panel al hacer clic fuera del contenido
  if (elements.panel) {
    elements.panel.addEventListener('click', function(e) {
      if (e.target === elements.panel) {
        hideProjectPanel();
      }
    });
  }

  // Inicializa favoritos al cargar
  renderFavoritesSection();

  // Limpia cache de favoritos al cambiar de pestaña
  window.addEventListener('storage', (e) => {
    if (e.key === 'dc_favorites') favoritesCache = null;
  });

  // Exponer funciones globalmente para reviews-handler.js (DENTRO del IIFE pero accesibles)
  window.loadReviews = loadReviews;
  window.getProjectReviews = getProjectReviews;
  window.calculateAverageRating = calculateAverageRating;
  window.generateStarsHTML = generateStarsHTML;
  window.getAllReviews = function() {
    return allReviews;
  };

})();
