#!/bin/bash
# Agregar botón admin después de botón ABRIR DEVCENTER
sed -i '619a\              <a id="adminBtn" href="admin.html" class="submit-btn" style="display:none;text-align:center;background:linear-gradient(45deg,#ef4444,#dc2626);box-shadow:0 8px 25px rgba(239,68,68,0.25);">Gestión de Proyectos</a>' index.html

# Cambiar validación URL para solo requerir .netlify.app
sed -i 's|const netlifyRegex = /^https:\\/\\/\[a-zA-Z0-9-\]+\\.netlify\\.app$/;|// Validar que contenga .netlify.app|' index.html
sed -i 's|if (!netlifyRegex.test(url)) {|if (!url.includes(".netlify.app")) {|' index.html
sed -i 's|showMessage.*La URL debe ser de Netlify.*|showMessage("La URL debe contener .netlify.app", "error");|' index.html
