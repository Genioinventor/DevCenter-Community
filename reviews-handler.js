// Reviews Handler - Sistema de reseñas para DevCenter
// Usa la constante REVIEWS_BIN_ID ya definida en script.js

// Función para obtener el nombre del usuario actual desde localStorage
function getCurrentUserName() {
  return localStorage.getItem('current_user_name') || '';
}

// Función para guardar el nombre del usuario actual en localStorage
function setCurrentUserName(userName) {
  localStorage.setItem('current_user_name', userName.trim());
}

// Función para verificar si el usuario actual ya comentó en un proyecto
function hasUserCommented(projectTitle, userName) {
  if (!userName) return false;
  
  // Verificar si existe una reseña para este usuario en este proyecto
  return window.loadReviewsData().then(allReviews => {
    const projectReviews = allReviews.filter(review => {
      if (!review.proyecto) {
        return true; // Incluir reseñas sin proyecto específico
      }
      return review.proyecto.toLowerCase() === projectTitle.toLowerCase();
    });
    
    return projectReviews.some(review => 
      review.usuario && review.usuario.toLowerCase().trim() === userName.toLowerCase().trim()
    );
  });
}


// Función para cargar reseñas (incluye reseñas locales y del servidor, evita duplicados)
async function loadReviewsData() {
  let serverReviews = [];
  let localReviews = [];
  
  // Cargar reseñas del servidor
  if (typeof window.loadReviews === 'function') {
    try {
      serverReviews = await window.loadReviews() || [];
    } catch(error) {
      console.warn('Error cargando reseñas del servidor:', error);
      serverReviews = [];
    }
  }
  
  // Cargar reseñas locales del localStorage
  try {
    localReviews = JSON.parse(localStorage.getItem('local_reviews') || '[]');
  } catch(e) {
    localReviews = [];
  }
  
  // Crear un mapa para deduplicación más robusta
  const reviewMap = new Map();
  
  // Primero agregar reseñas del servidor (tienen prioridad)
  serverReviews.forEach(review => {
    const key = generateReviewKey(review);
    reviewMap.set(key, { ...review, _source: 'server' });
  });
  
  // Luego agregar reseñas locales solo si no existen ya en el servidor
  const validLocalReviews = [];
  localReviews.forEach(review => {
    const key = generateReviewKey(review);
    if (!reviewMap.has(key)) {
      reviewMap.set(key, { ...review, _source: 'local' });
      validLocalReviews.push(review);
    }
  });
  
  // Si hay reseñas locales que ya están en el servidor, limpiar localStorage
  if (localReviews.length > validLocalReviews.length) {
    console.log('[Reviews] Limpiando reseñas locales duplicadas del localStorage');
    localStorage.setItem('local_reviews', JSON.stringify(validLocalReviews));
  }
  
  const uniqueReviews = Array.from(reviewMap.values());
  console.log('[Reviews] Reseñas únicas cargadas:', uniqueReviews.length, '| Servidor:', serverReviews.length, '| Locales:', validLocalReviews.length);
  return uniqueReviews;
}

// Función auxiliar para generar una clave única de reseña más robusta
// No incluye fecha para evitar duplicados cuando las fechas cambian entre envío local/servidor
function generateReviewKey(review) {
  const normalizedUser = (review.usuario || '').trim().toLowerCase();
  const normalizedComment = (review.comentario || '').trim().toLowerCase();
  const normalizedProject = (review.proyecto || '').trim().toLowerCase();
  
  return `${normalizedUser}|${normalizedComment}|${normalizedProject}`;
}

// Función para agregar estilos CSS si no existen
function addReviewStyles() {
  if (document.getElementById('review-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'review-styles';
  style.textContent = `
    /* Arreglar el problema de la descripción que desaparece */
    .panel-body {
      overflow: visible !important;
      flex: 1 !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .panel-description {
      max-height: none !important;
      flex-shrink: 0 !important;
      overflow: visible !important;
    }
    .reviews-section {
      overflow: visible !important;
      max-height: none !important;
      flex-shrink: 0 !important;
    }
    .project-rating { display: flex; align-items: center; gap: 8px; margin: 8px 0 12px 0; flex-wrap: wrap; }
    .stars-container { display: flex; align-items: center; gap: 2px; }
    .star-filled { color: #facc15; font-size: 1rem; }
    .star-half { color: #facc15; font-size: 1rem; opacity: 0.6; }
    .star-empty { color: rgba(255,255,255,0.3); font-size: 1rem; }
    .rating-text { font-size: 0.9rem; color: rgba(255,255,255,0.7); font-weight: 500; }
    .reviews-section { margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }
    .reviews-title { font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .review-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 12px; transition: all 0.3s ease; }
    .review-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
    .review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px; }
    .review-user { font-weight: 600; color: #facc15; font-size: 0.95rem; }
    .review-date { font-size: 0.85rem; color: rgba(255,255,255,0.5); }
    .review-stars { margin: 6px 0; }
    .review-comment { color: rgba(255,255,255,0.9); line-height: 1.5; font-size: 0.95rem; word-wrap: break-word; overflow-wrap: break-word; }
    .no-reviews { text-align: center; color: rgba(255,255,255,0.5); font-style: italic; padding: 20px; }
    .review-form { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 16px 0; }
    .review-form h3 { color: #facc15; margin-bottom: 16px; font-size: 1.1rem; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 8px; color: rgba(255,255,255,0.8); font-weight: 500; font-size: 0.9rem; }
    .form-group input, .form-group textarea { width: 100%; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; font-size: 0.9rem; box-sizing: border-box; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #facc15; background: rgba(255,255,255,0.05); }
    .form-group textarea { min-height: 80px; resize: vertical; }
    .rating-input { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
    .star-button { background: none; border: none; font-size: 1.5rem; color: rgba(255,255,255,0.3); cursor: pointer; transition: color 0.2s; }
    .star-button:hover, .star-button.selected { color: #facc15; }
    .submit-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; width: 100%; }
    .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3); }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .form-message { padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 0.9rem; }
    .form-message.success { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); }
    .form-message.error { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    
    @media (max-width: 768px) {
      .review-form { padding: 16px; }
      .review-form h3 { font-size: 1rem; }
      .form-group label { font-size: 0.85rem; }
      .form-group input, .form-group textarea { padding: 10px; font-size: 0.85rem; }
      .form-group textarea { min-height: 60px; }
      .star-button { font-size: 1.3rem; }
      .submit-btn { padding: 10px 20px; font-size: 0.95rem; }
    }
    
    @media (max-width: 480px) {
      .review-form { padding: 14px; }
      .review-form h3 { font-size: 0.95rem; margin-bottom: 12px; }
      .form-group { margin-bottom: 12px; }
      .form-group label { font-size: 0.8rem; }
      .form-group input, .form-group textarea { padding: 8px; font-size: 0.8rem; }
      .star-button { font-size: 1.2rem; }
      .submit-btn { padding: 9px 18px; font-size: 0.9rem; }
      .form-message { padding: 10px; font-size: 0.85rem; }
    }
    
    @media (prefers-color-scheme: light) {
      .star-empty { color: rgba(0,0,0,0.4) !important; }
      .rating-text { color: #000000 !important; font-weight: 700 !important; }
      .reviews-section { border-top: 3px solid rgba(0,0,0,0.35) !important; }
      .reviews-title { color: #000000 !important; font-weight: 800 !important; }
      .review-item { background: rgba(0,0,0,0.08) !important; border: 3px solid rgba(0,0,0,0.4) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
      .review-item:hover { background: rgba(0,0,0,0.12) !important; border-color: rgba(0,0,0,0.5) !important; box-shadow: 0 6px 16px rgba(0,0,0,0.2) !important; }
      .review-user { color: #ea580c !important; font-weight: 800 !important; }
      .review-date { color: rgba(0,0,0,0.75) !important; font-weight: 600 !important; }
      .review-comment { color: #000000 !important; font-weight: 600 !important; line-height: 1.7 !important; }
      .no-reviews { color: rgba(0,0,0,0.7) !important; font-weight: 600 !important; }
      .review-form { background: rgba(0,0,0,0.08) !important; border: 3px solid rgba(0,0,0,0.4) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
      .review-form h3 { color: #ea580c !important; font-weight: 800 !important; }
      .form-group label { color: #000000 !important; font-weight: 700 !important; }
      .form-group input, .form-group textarea { background: #ffffff !important; border: 3px solid rgba(0,0,0,0.45) !important; color: #000000 !important; font-weight: 600 !important; }
      .form-group input::placeholder, .form-group textarea::placeholder { color: rgba(0,0,0,0.6) !important; }
      .form-group input:focus, .form-group textarea:focus { border-color: #ea580c !important; background: #ffffff !important; box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.2) !important; }
      .star-button { color: rgba(0,0,0,0.4) !important; }
      .star-button:hover, .star-button.selected { color: #ea580c !important; }
      #ratingText { color: #000000 !important; font-weight: 700 !important; }
      .form-message.success { background: rgba(34, 197, 94, 0.25) !important; color: #14532d !important; border: 3px solid rgba(34, 197, 94, 0.6) !important; font-weight: 700 !important; }
      .form-message.error { background: rgba(239, 68, 68, 0.25) !important; color: #991b1b !important; border: 3px solid rgba(239, 68, 68, 0.6) !important; font-weight: 700 !important; }
    }
    
    html.theme-light .star-empty { color: rgba(0,0,0,0.4) !important; }
    html.theme-light .rating-text { color: #000000 !important; font-weight: 700 !important; }
    html.theme-light .reviews-section { border-top: 3px solid rgba(0,0,0,0.35) !important; }
    html.theme-light .reviews-title { color: #000000 !important; font-weight: 800 !important; }
    html.theme-light .review-item { background: rgba(0,0,0,0.08) !important; border: 3px solid rgba(0,0,0,0.4) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
    html.theme-light .review-item:hover { background: rgba(0,0,0,0.12) !important; border-color: rgba(0,0,0,0.5) !important; box-shadow: 0 6px 16px rgba(0,0,0,0.2) !important; }
    html.theme-light .review-user { color: #ea580c !important; font-weight: 800 !important; }
    html.theme-light .review-date { color: rgba(0,0,0,0.75) !important; font-weight: 600 !important; }
    html.theme-light .review-comment { color: #000000 !important; font-weight: 600 !important; line-height: 1.7 !important; }
    html.theme-light .no-reviews { color: rgba(0,0,0,0.7) !important; font-weight: 600 !important; }
    html.theme-light .review-form { background: rgba(0,0,0,0.08) !important; border: 3px solid rgba(0,0,0,0.4) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
    html.theme-light .review-form h3 { color: #ea580c !important; font-weight: 800 !important; }
    html.theme-light .form-group label { color: #000000 !important; font-weight: 700 !important; }
    html.theme-light .form-group input, html.theme-light .form-group textarea { background: #ffffff !important; border: 3px solid rgba(0,0,0,0.45) !important; color: #000000 !important; font-weight: 600 !important; }
    html.theme-light .form-group input::placeholder, html.theme-light .form-group textarea::placeholder { color: rgba(0,0,0,0.6) !important; }
    html.theme-light .form-group input:focus, html.theme-light .form-group textarea:focus { border-color: #ea580c !important; background: #ffffff !important; box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.2) !important; }
    html.theme-light .star-button { color: rgba(0,0,0,0.4) !important; }
    html.theme-light .star-button:hover, html.theme-light .star-button.selected { color: #ea580c !important; }
    html.theme-light #ratingText { color: #000000 !important; font-weight: 700 !important; }
    html.theme-light .form-message.success { background: rgba(34, 197, 94, 0.25) !important; color: #14532d !important; border: 3px solid rgba(34, 197, 94, 0.6) !important; font-weight: 700 !important; }
    html.theme-light .form-message.error { background: rgba(239, 68, 68, 0.25) !important; color: #991b1b !important; border: 3px solid rgba(239, 68, 68, 0.6) !important; font-weight: 700 !important; }
  `;
  document.head.appendChild(style);
}

// Función para generar HTML de estrellas con validación
function generateStarsHTML(rating) {
  // Limitar rating al rango válido [0,5]
  rating = Math.max(0, Math.min(5, rating || 0));
  
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

// Función para crear el formulario de reseñas
function createReviewForm(projectTitle) {
  const form = document.createElement('div');
  form.className = 'review-form';
  
  // Obtener el nombre del usuario guardado
  const savedUserName = getCurrentUserName();
  
  form.innerHTML = `
    <h3>✍️ Escribir una reseña</h3>
    <form id="reviewForm">
      <div class="form-group">
        <label for="userName">Tu nombre:</label>
        <input type="text" id="userName" name="userName" required maxlength="50" placeholder="Introduce tu nombre">
      </div>
      <div class="form-group">
        <label for="userComment">Comentario:</label>
        <textarea id="userComment" name="userComment" required maxlength="500" placeholder="Comparte tu experiencia con este proyecto..."></textarea>
      </div>
      <div class="form-group">
        <label>Calificación:</label>
        <div class="rating-input" id="starRating">
          <button type="button" class="star-button" data-rating="1">★</button>
          <button type="button" class="star-button" data-rating="2">★</button>
          <button type="button" class="star-button" data-rating="3">★</button>
          <button type="button" class="star-button" data-rating="4">★</button>
          <button type="button" class="star-button" data-rating="5">★</button>
          <span id="ratingText" style="margin-left: 12px; color: rgba(255,255,255,0.7); font-size: 0.9rem;">Selecciona una calificación</span>
        </div>
      </div>
      <button type="submit" class="submit-btn">Enviar Reseña</button>
      <div id="formMessage"></div>
    </form>
  `;
  
  // Agregar funcionalidad de rating
  // Establecer el valor del nombre de usuario de forma segura usando DOM APIs
  const userNameInput = form.querySelector('#userName');
  if (savedUserName && userNameInput) {
    userNameInput.value = savedUserName;
  }
  
  const starButtons = form.querySelectorAll('.star-button');
  const ratingText = form.querySelector('#ratingText');
  let selectedRating = 0;
  
  // Función para resetear el rating (expuesta para submitReview)
  form.resetRating = () => {
    selectedRating = 0;
    updateStarRating(starButtons, selectedRating, ratingText);
  };
  
  starButtons.forEach(button => {
    button.addEventListener('click', () => {
      selectedRating = parseInt(button.dataset.rating);
      updateStarRating(starButtons, selectedRating, ratingText);
    });
    
    button.addEventListener('mouseover', () => {
      const hoverRating = parseInt(button.dataset.rating);
      updateStarRating(starButtons, hoverRating, ratingText, true);
    });
  });
  
  form.addEventListener('mouseleave', () => {
    updateStarRating(starButtons, selectedRating, ratingText);
  });
  
  // Agregar manejador de envío del formulario
  const reviewForm = form.querySelector('#reviewForm');
  reviewForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Guardar el nombre del usuario antes de enviar
    const userName = form.querySelector('#userName').value.trim();
    if (userName) {
      setCurrentUserName(userName);
    }
    
    submitReview(projectTitle, selectedRating, form);
  });
  
  return form;
}

// Función para actualizar la visualización de estrellas
function updateStarRating(starButtons, rating, ratingText, isHover = false) {
  starButtons.forEach((button, index) => {
    if (index < rating) {
      button.classList.add('selected');
    } else {
      button.classList.remove('selected');
    }
  });
  
  if (rating > 0) {
    const ratingLabels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];
    ratingText.textContent = `${rating}/5 - ${ratingLabels[rating]}`;
  } else {
    ratingText.textContent = 'Selecciona una calificación';
  }
}

// Función para enviar reseña al JSON Bin con validación y seguridad mejorada
async function submitReview(projectTitle, rating, formElement) {
  const userName = formElement.querySelector('#userName').value.trim();
  const userComment = formElement.querySelector('#userComment').value.trim();
  const submitBtn = formElement.querySelector('.submit-btn');
  const messageDiv = formElement.querySelector('#formMessage');
  
  // Validación
  if (!userName || !userComment || rating === 0) {
    showFormMessage(messageDiv, 'Por favor completa todos los campos y selecciona una calificación.', 'error');
    return;
  }
  
  // Validación adicional de seguridad
  if (userName.length > 50 || userComment.length > 500) {
    showFormMessage(messageDiv, 'Nombre o comentario demasiado largo.', 'error');
    return;
  }
  
  // Limitar calificación a rango válido
  rating = Math.max(1, Math.min(5, rating));
  
  // Deshabilitar botón durante envío
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';
  
  // Crear nueva reseña con datos sanitizados (definir fuera del try para usarla en catch)
  const reviewDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
  const newReview = {
    usuario: userName.substring(0, 50), // Limitar longitud
    proyecto: projectTitle,
    comentario: userComment.substring(0, 500), // Limitar longitud  
    estrellas: rating,
    fecha: reviewDate,
    // Agregar ID único para evitar duplicados incluso con mismo contenido
    _reviewId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  try {
    
    // Verificar que no sea duplicada localmente antes de enviar (excluir reseñas locales para permitir reintento)
    const localReviews = JSON.parse(localStorage.getItem('local_reviews') || '[]');
    const newReviewKey = generateReviewKey(newReview);
    const isDuplicateLocal = localReviews.some(review => 
      !review._isLocal && generateReviewKey(review) === newReviewKey
    );
    
    if (isDuplicateLocal) {
      showFormMessage(messageDiv, 'Esta reseña ya existe. Por favor escribe un comentario diferente.', 'error');
      return;
    }
    
    // Obtener solo reseñas del servidor (sin locales) para el envío
    const serverReviews = await window.loadReviews() || [];
    
    // Verificar que no sea duplicada en el servidor
    const isDuplicateServer = serverReviews.some(review => generateReviewKey(review) === newReviewKey);
    
    if (isDuplicateServer) {
      showFormMessage(messageDiv, 'Esta reseña ya existe en el servidor. Por favor escribe un comentario diferente.', 'error');
      return;
    }
    
    // Agregar nueva reseña al inicio
    const updatedReviews = [newReview, ...serverReviews];
    
    // Intentar enviar al JSON Bin usando el ID configurado
    const REVIEWS_BIN_ID = window.REVIEWS_BIN_ID || '68d839ed43b1c97be9523e04';
    console.log('[✔️] Solicitud enviada a la API');
    const response = await fetch(`https://api.jsonbin.io/v3/b/${REVIEWS_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        comentarios: updatedReviews
      })
    });
    
    if (response.ok) {
      showFormMessage(messageDiv, 'Tu reseña se ha enviado correctamente. ¡Gracias por tu feedback!', 'success');
      
      // Limpiar reseñas locales que ya están en el servidor
      try {
        const updatedLocalReviews = localReviews.filter(review => {
          const reviewKey = generateReviewKey(review);
          return !updatedReviews.some(serverReview => generateReviewKey(serverReview) === reviewKey);
        });
        
        if (updatedLocalReviews.length !== localReviews.length) {
          localStorage.setItem('local_reviews', JSON.stringify(updatedLocalReviews));
          console.log('[Reviews] Limpiadas reseñas locales duplicadas después del envío exitoso');
        }
      } catch(e) {
        console.warn('[Reviews] Error limpiando reseñas locales:', e);
      }
      
      // Limpiar formulario y resetear rating
      formElement.querySelector('#reviewForm').reset();
      formElement.querySelectorAll('.star-button').forEach(btn => btn.classList.remove('selected'));
      formElement.querySelector('#ratingText').textContent = 'Selecciona una calificación';
      
      // Resetear selectedRating
      if (formElement.resetRating) {
        formElement.resetRating();
      }
      
      // Actualizar vista inmediatamente sin timeout
      setTimeout(async () => {
        await addReviewsToPanel(projectTitle);
      }, 1500);
      
    } else {
      // Si falla el envío al servidor, guardar localmente como respaldo
      console.warn('Fallo al enviar al JSON Bin, guardando localmente');
      
      // Agregar marca de local para distinguir y preservar fecha original
      newReview._isLocal = true;
      // Mantener la fecha original de creación
      newReview._originalDate = reviewDate;
      
      let localReviews = [];
      try {
        localReviews = JSON.parse(localStorage.getItem('local_reviews') || '[]');
      } catch(e) {
        localReviews = [];
      }
      
      localReviews.unshift(newReview);
      localStorage.setItem('local_reviews', JSON.stringify(localReviews));
      
      showFormMessage(messageDiv, 'Tu reseña se ha guardado localmente. El servidor no está disponible en este momento.', 'success');
      
      // Limpiar formulario
      formElement.querySelector('#reviewForm').reset();
      formElement.querySelectorAll('.star-button').forEach(btn => btn.classList.remove('selected'));
      formElement.querySelector('#ratingText').textContent = 'Selecciona una calificación';
      
      if (formElement.resetRating) {
        formElement.resetRating();
      }
      
      // Actualizar vista inmediatamente
      await addReviewsToPanel(projectTitle);
    }
    
  } catch (error) {
    console.error('Error enviando reseña:', error);
    
    // Como fallback, guardar localmente
    const fallbackReview = {
      usuario: userName.substring(0, 50),
      proyecto: projectTitle,
      comentario: userComment.substring(0, 500),
      estrellas: rating,
      fecha: reviewDate,
      _isLocal: true,
      _originalDate: reviewDate,
      _reviewId: newReview._reviewId // Usar el mismo ID
    };
    
    try {
      let localReviews = JSON.parse(localStorage.getItem('local_reviews') || '[]');
      localReviews.unshift(fallbackReview);
      localStorage.setItem('local_reviews', JSON.stringify(localReviews));
      
      showFormMessage(messageDiv, 'Tu reseña se ha guardado localmente. Hubo un problema con el servidor.', 'success');
      
      // Limpiar formulario
      formElement.querySelector('#reviewForm').reset();
      formElement.querySelectorAll('.star-button').forEach(btn => btn.classList.remove('selected'));
      formElement.querySelector('#ratingText').textContent = 'Selecciona una calificación';
      
      if (formElement.resetRating) {
        formElement.resetRating();
      }
      
      // Actualizar vista inmediatamente
      await addReviewsToPanel(projectTitle);
      
    } catch(fallbackError) {
      showFormMessage(messageDiv, 'Hubo un error al enviar tu reseña. Por favor intenta de nuevo.', 'error');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar Reseña';
  }
}

// Función para mostrar mensajes en el formulario
function showFormMessage(messageDiv, text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `form-message ${type}`;
  messageDiv.style.display = 'block';
  
  // Auto ocultar después de 5 segundos
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

// Variable para evitar llamadas duplicadas
let addingReviews = false;

// Función para agregar reseñas al panel
async function addReviewsToPanel(projectTitle) {
  // Prevenir llamadas simultáneas
  if (addingReviews) {
    console.log('[Reviews] Ya se están agregando reseñas, ignorando llamada duplicada');
    return;
  }
  
  addingReviews = true;
  
  try {
    console.log('[Reviews] Agregando reseñas al panel para:', projectTitle);
    const panelBody = document.querySelector('.panel-body');
    if (!panelBody) {
      console.warn('[Reviews] No se encontró panel-body');
      return;
    }
    
    
    // Asegurar que los estilos estén cargados
    addReviewStyles();
    
    // Remover sección de reseñas anterior si existe (evitar duplicados)
    const existingSection = document.getElementById('reviewsSection');
    if (existingSection) {
      console.log('[Reviews] Removiendo sección anterior para evitar duplicados');
      existingSection.remove();
    }
    
    const allReviews = await loadReviewsData();
    const projectReviews = allReviews.filter(review => {
      // Si no tiene proyecto específico, asumir que es para el proyecto actual
      // (para compatibilidad con diferentes esquemas de datos)
      if (!review.proyecto) {
        return true; // Incluir reseñas sin proyecto específico
      }
      return review.proyecto.toLowerCase() === projectTitle.toLowerCase();
    });
    
    const reviewsSection = document.createElement('div');
    reviewsSection.id = 'reviewsSection';
    reviewsSection.className = 'reviews-section';
    
    const reviewsTitle = document.createElement('div');
    reviewsTitle.className = 'reviews-title';
    reviewsTitle.textContent = '⭐ Reseñas y Comentarios'; // Usar textContent por seguridad
    
    reviewsSection.appendChild(reviewsTitle);
    
    // Verificar si el usuario actual ya comentó
    const currentUser = getCurrentUserName();
    if (currentUser) {
      const userHasCommented = await hasUserCommented(projectTitle, currentUser);
      
      if (!userHasCommented) {
        // Si no ha comentado, mostrar el formulario
        const reviewForm = createReviewForm(projectTitle);
        reviewsSection.appendChild(reviewForm);
      }
      // Si ya comentó, no mostrar nada (queda vacío)
    } else {
      // Si no hay usuario guardado, mostrar el formulario
      const reviewForm = createReviewForm(projectTitle);
      reviewsSection.appendChild(reviewForm);
    }
    
    const reviewsContainer = document.createElement('div');
    reviewsContainer.className = 'reviews-container';
    
    if (projectReviews.length === 0) {
      const noReviewsDiv = document.createElement('div');
      noReviewsDiv.className = 'no-reviews';
      noReviewsDiv.textContent = 'No hay reseñas disponibles para este proyecto. ¡Sé el primero en escribir una!';
      reviewsContainer.appendChild(noReviewsDiv);
    } else {
      projectReviews.forEach(review => {
        const reviewDate = review.fecha ? new Date(review.fecha).toLocaleDateString() : 'Fecha no disponible';
        
        const reviewDiv = document.createElement('div');
        reviewDiv.className = 'review-item';
        
        // Crear elementos de forma segura para evitar XSS
        const reviewHeader = document.createElement('div');
        reviewHeader.className = 'review-header';
        
        const reviewUser = document.createElement('div');
        reviewUser.className = 'review-user';
        // SEGURIDAD: Usar textContent para prevenir XSS
        reviewUser.textContent = (review.usuario || 'Usuario anónimo').substring(0, 50);
        
        const reviewDateEl = document.createElement('div');
        reviewDateEl.className = 'review-date';
        reviewDateEl.textContent = reviewDate;
        
        const reviewStars = document.createElement('div');
        reviewStars.className = 'review-stars';
        // innerHTML es seguro aquí porque generateStarsHTML solo genera elementos HTML conocidos
        reviewStars.innerHTML = generateStarsHTML(review.estrellas || 0);
        
        const reviewComment = document.createElement('div');
        reviewComment.className = 'review-comment';
        // SEGURIDAD: Usar textContent para prevenir XSS
        reviewComment.textContent = (review.comentario || 'Sin comentario').substring(0, 500);
        
        reviewHeader.appendChild(reviewUser);
        reviewHeader.appendChild(reviewDateEl);
        
        reviewDiv.appendChild(reviewHeader);
        reviewDiv.appendChild(reviewStars);
        reviewDiv.appendChild(reviewComment);
        reviewsContainer.appendChild(reviewDiv);
      });
    }
    
    reviewsSection.appendChild(reviewsContainer);
    
    // Verificar si el proyecto pertenece al usuario actual
    const loggedInUser = localStorage.getItem('currentUser');
    console.log('[Reviews] Usuario actual:', loggedInUser);
    console.log('[Reviews] Título del proyecto:', projectTitle);
    
    if (loggedInUser) {
      const allUserProjects = JSON.parse(localStorage.getItem('user_projects') || '{}');
      const userProjects = allUserProjects[loggedInUser] || [];
      console.log('[Reviews] Proyectos del usuario:', userProjects);
      
      // Verificar si este proyecto pertenece al usuario
      const isOwner = userProjects.some(p => 
        (p.title || '').toLowerCase() === projectTitle.toLowerCase()
      );
      
      console.log('[Reviews] ¿Es propietario?:', isOwner);
    }
    
    panelBody.appendChild(reviewsSection);
    
    const panelEditBtn = document.getElementById('panelEditBtn');
    if (panelEditBtn) {
      panelBody.appendChild(panelEditBtn);
    }
    
  } catch (error) {
    console.error('[Reviews] Error agregando reseñas al panel:', error);
  } finally {
    addingReviews = false;
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  addReviewStyles();
  console.log('[Reviews] Sistema de reseñas inicializado');
});

// Exponer funciones globalmente
window.addReviewsToPanel = addReviewsToPanel;
window.loadReviewsData = loadReviewsData;