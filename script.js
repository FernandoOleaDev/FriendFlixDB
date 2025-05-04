document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const addBtn = document.getElementById('add-btn');
    const addModal = document.getElementById('add-modal');
    const closeBtn = document.querySelector('.close');
    const addForm = document.getElementById('add-form');
    const moviesList = document.getElementById('movies-list');
    const searchInput = document.getElementById('search');
    const isSeriesSelect = document.getElementById('is-series');
    const seasonsGroup = document.getElementById('seasons-group');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editCloseBtn = document.querySelector('#edit-modal .close');
    const adminBtn = document.getElementById('admin-mode-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminForm = document.getElementById('admin-form');
    const adminCloseBtn = document.querySelector('#admin-modal .close');
    
    // Contraseña de admin (debería ser más segura en un entorno real)
    const ADMIN_PASSWORD = "friendflix123";
    
    // Track the current row being edited
    let currentEditRow = null;
    // Variable para almacenar todas las películas
    let allMovies = [];

    // Comprobar si el usuario ya está en modo admin
    checkAdminStatus();

    // Load movies data from CSV
    fetchMoviesData();

    // Event listeners
    addBtn.addEventListener('click', () => {
        addModal.style.display = 'block';
        document.body.classList.add('modal-open');
    });

    closeBtn.addEventListener('click', () => {
        addModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    });

    editCloseBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    });

    adminCloseBtn.addEventListener('click', () => {
        adminModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    });

    adminBtn.addEventListener('click', () => {
        adminModal.style.display = 'block';
        document.body.classList.add('modal-open');
    });

    adminForm.addEventListener('submit', handleAdminLogin);

    window.addEventListener('click', (e) => {
        if (e.target === addModal) {
            addModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
        if (e.target === editModal) {
            editModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
        if (e.target === adminModal) {
            adminModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    });

    addForm.addEventListener('submit', handleFormSubmit);
    editForm.addEventListener('submit', handleEditFormSubmit);
    searchInput.addEventListener('input', filterMovies);
    
    isSeriesSelect.addEventListener('change', function() {
        if (this.value === 'Sí') {
            seasonsGroup.style.display = 'block';
        } else {
            seasonsGroup.style.display = 'none';
            document.getElementById('seasons').value = '';
        }
    });

    document.getElementById('edit-is-series').addEventListener('change', function() {
        if (this.value === 'Sí') {
            document.getElementById('edit-seasons-group').style.display = 'block';
        } else {
            document.getElementById('edit-seasons-group').style.display = 'none';
            document.getElementById('edit-seasons').value = '';
        }
    });

    // Admin functionality
    function handleAdminLogin(e) {
        e.preventDefault();
        const password = document.getElementById('admin-password').value;
        
        if (password === ADMIN_PASSWORD) {
            // Guardar estado de admin en localStorage
            localStorage.setItem('isAdmin', 'true');
            // Actualizar UI
            adminBtn.classList.add('admin-active');
            adminModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            
            // Mostrar notificación si hay cambios pendientes
            const pendingMovies = JSON.parse(localStorage.getItem('pendingMovies') || '[]');
            if (pendingMovies.length > 0) {
                createPendingChangesNotification(pendingMovies.length);
            }
            
            alert('¡Modo administrador activado!');
        } else {
            alert('Contraseña incorrecta');
        }
    }

    function checkAdminStatus() {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (isAdmin) {
            adminBtn.classList.add('admin-active');
        }
    }

    // Functions
    async function fetchMoviesData() {
        try {
            // Primero intentar cargar desde localStorage
            const storedMovies = localStorage.getItem('pendingMovies');
            const localMovies = storedMovies ? JSON.parse(storedMovies) : [];
            
            // Luego cargar desde CSV
            const response = await fetch('movies.csv');
            const csvText = await response.text();
            const csvMovies = parseCSV(csvText);
            
            // Combinar ambas fuentes, dando prioridad a las pendientes
            allMovies = [...csvMovies];
            
            // Añadir películas pendientes o actualizadas
            localMovies.forEach(pendingMovie => {
                if (pendingMovie.action === 'add') {
                    allMovies.push(pendingMovie.data);
                } else if (pendingMovie.action === 'update') {
                    // Buscar por título y fecha de petición (identificadores únicos)
                    const index = allMovies.findIndex(m => 
                        m.Título === pendingMovie.originalData.Título && 
                        m['Fecha de Petición'] === pendingMovie.originalData['Fecha de Petición']);
                    
                    if (index !== -1) {
                        allMovies[index] = pendingMovie.data;
                    }
                }
            });
            
            displayMovies(allMovies);
            
            // Mostrar notificación SOLO para el administrador si hay cambios pendientes
            // Comprobamos si el usuario actual es administrador mediante localStorage
            const isAdmin = localStorage.getItem('isAdmin') === 'true';
            if (isAdmin && localMovies.length > 0) {
                createPendingChangesNotification(localMovies.length);
            }
        } catch (error) {
            console.error('Error fetching movies data:', error);
            displayError('No se pudo cargar la lista. Intenta más tarde.');
        }
    }

    function parseCSV(text) {
        const lines = text.split('\n');
        const headers = lines[0].split('\t');
        
        return lines.slice(1).filter(line => line.trim() !== '').map(line => {
            const values = line.split('\t');
            const movie = {};
            
            headers.forEach((header, index) => {
                movie[header.trim()] = values[index] ? values[index].trim() : '';
            });
            
            return movie;
        });
    }

    // Función para convertir una fecha en formato DD/MM/YYYY a un objeto Date para comparar
    function convertToDate(dateString) {
        if (!dateString) return new Date(0); // Si no hay fecha, asignar fecha muy antigua
        
        const parts = dateString.split('/');
        if (parts.length !== 3) return new Date(0);
        
        // Formato de fecha español DD/MM/YYYY
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }

    function displayMovies(movies) {
        moviesList.innerHTML = '';
        
        if (movies.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="10" class="empty-message">No hay peticiones disponibles</td>';
            moviesList.appendChild(emptyRow);
            return;
        }
        
        // Ordenar las películas por fecha de petición (más recientes primero)
        const sortedMovies = [...movies].sort((a, b) => {
            const dateA = convertToDate(a['Fecha de Petición']);
            const dateB = convertToDate(b['Fecha de Petición']);
            return dateB - dateA; // Orden descendente (más reciente primero)
        });
        
        sortedMovies.forEach((movie, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            
            row.innerHTML = `
                <td>${movie.Título || ''}</td>
                <td>${movie['Subiendo al Servidor'] || 'No'}</td>
                <td>${movie['En Servidor'] || 'No'}</td>
                <td>${movie['Petición de'] || ''}</td>
                <td>${movie['Fecha de Petición'] || ''}</td>
                <td>${movie.Comentarios || ''}</td>
                <td>${movie['Es Serie'] || 'No'}</td>
                <td>${movie.Temporadas || ''}</td>
                <td>${movie['Año de Lanzamiento'] || ''}</td>
                <td>
                    <button class="edit-btn" data-index="${index}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            
            moviesList.appendChild(row);
        });
        
        // Add edit button event listeners
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', handleEditClick);
        });
    }

    function handleEditClick(e) {
        const index = e.currentTarget.dataset.index;
        const movies = getMoviesFromTable();
        const movie = movies[index];
        currentEditRow = index;
        
        // Fill the edit form with the movie data
        document.getElementById('edit-title').value = movie.Título || '';
        document.getElementById('edit-uploading').value = movie['Subiendo al Servidor'] || 'No';
        document.getElementById('edit-on-server').value = movie['En Servidor'] || 'No';
        document.getElementById('edit-requested-by').value = movie['Petición de'] || '';
        document.getElementById('edit-request-date').value = movie['Fecha de Petición'] || '';
        document.getElementById('edit-comments').value = movie.Comentarios || '';
        document.getElementById('edit-is-series').value = movie['Es Serie'] || 'No';
        
        // Handle the seasons field visibility and value
        if (movie['Es Serie'] === 'Sí') {
            document.getElementById('edit-seasons-group').style.display = 'block';
            document.getElementById('edit-seasons').value = movie.Temporadas || '1';
        } else {
            document.getElementById('edit-seasons-group').style.display = 'none';
            document.getElementById('edit-seasons').value = '';
        }
        
        document.getElementById('edit-release-year').value = movie['Año de Lanzamiento'] || '';
        
        // Show the edit modal
        editModal.style.display = 'block';
        document.body.classList.add('modal-open'); // Añadir clase para bloquear scroll
    }

    function getMoviesFromTable() {
        const rows = moviesList.querySelectorAll('tr');
        const movies = [];
        
        rows.forEach(row => {
            if (!row.querySelector('.empty-message')) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 9) {
                    const movie = {
                        'Título': cells[0].textContent,
                        'Subiendo al Servidor': cells[1].textContent,
                        'En Servidor': cells[2].textContent,
                        'Petición de': cells[3].textContent,
                        'Fecha de Petición': cells[4].textContent,
                        'Comentarios': cells[5].textContent,
                        'Es Serie': cells[6].textContent,
                        'Temporadas': cells[7].textContent,
                        'Año de Lanzamiento': cells[8].textContent
                    };
                    movies.push(movie);
                }
            }
        });
        
        return movies;
    }

    async function handleEditFormSubmit(e) {
        e.preventDefault();
        
        if (currentEditRow === null) return;
        
        const updatedMovie = {
            'Título': document.getElementById('edit-title').value,
            'Subiendo al Servidor': document.getElementById('edit-uploading').value,
            'En Servidor': document.getElementById('edit-on-server').value,
            'Petición de': document.getElementById('edit-requested-by').value,
            'Fecha de Petición': document.getElementById('edit-request-date').value,
            'Comentarios': document.getElementById('edit-comments').value,
            'Es Serie': document.getElementById('edit-is-series').value,
            'Temporadas': document.getElementById('edit-is-series').value === 'Sí' ? document.getElementById('edit-seasons').value : '',
            'Año de Lanzamiento': document.getElementById('edit-release-year').value
        };
        
        try {
            await updateMovieInCSV(updatedMovie, currentEditRow);
            editModal.style.display = 'none';
            document.body.classList.remove('modal-open'); // Remover clase para permitir scroll
            editForm.reset();
            currentEditRow = null;
            fetchMoviesData(); // Refresh the list
        } catch (error) {
            console.error('Error updating movie:', error);
            alert('Error al actualizar el contenido. Inténtalo de nuevo.');
        }
    }

    function filterMovies() {
        const searchTerm = searchInput.value.toLowerCase();
        const rows = moviesList.querySelectorAll('tr');
        
        rows.forEach(row => {
            const titleCell = row.querySelector('td:first-child');
            if (titleCell) {
                const title = titleCell.textContent.toLowerCase();
                row.style.display = title.includes(searchTerm) ? '' : 'none';
            }
        });
    }

    // Función para obtener la fecha currentDate en formato legible
    function getCurrentDate() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}/${month}/${year}`;
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Agregar la fecha currentDate automaticamente
        const currentDate = getCurrentDate();
        
        const newMovie = {
            'Título': document.getElementById('title').value,
            'Subiendo al Servidor': document.getElementById('uploading').value,
            'En Servidor': document.getElementById('on-server').value,
            'Petición de': document.getElementById('requested-by').value,
            'Fecha de Petición': currentDate,
            'Comentarios': document.getElementById('comments').value,
            'Es Serie': document.getElementById('is-series').value,
            'Temporadas': document.getElementById('is-series').value === 'Sí' ? document.getElementById('seasons').value : '',
            'Año de Lanzamiento': document.getElementById('release-year').value
        };
        
        try {
            await addMovieToCSV(newMovie);
            addModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            addForm.reset();
            fetchMoviesData(); // Refresh the list
        } catch (error) {
            console.error('Error adding movie:', error);
            alert('Error al añadir el contenido. Inténtalo de nuevo.');
        }
    }

    async function addMovieToCSV(movie) {
        try {
            // Obtener películas pendientes del localStorage
            const pendingMovies = JSON.parse(localStorage.getItem('pendingMovies') || '[]');
            
            // Añadir la nueva película a la lista de pendientes
            pendingMovies.push({
                action: 'add',
                data: movie,
                timestamp: Date.now()
            });
            
            // Guardar en localStorage
            localStorage.setItem('pendingMovies', JSON.stringify(pendingMovies));
            
            // Mostrar mensaje de éxito simplificado (para usuarios normales)
            alert('Contenido añadido correctamente. ¡Gracias por tu petición!');
            
            return Promise.resolve();
        } catch (error) {
            console.error('Error in addMovieToCSV:', error);
            return Promise.reject(error);
        }
    }

    // Función para crear notificación de cambios pendientes (solo para admin)
    function createPendingChangesNotification(count) {
        // Eliminar notificación existente si hay
        const existingNotification = document.querySelector('.pending-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Crear nueva notificación
        const notification = document.createElement('div');
        notification.className = 'pending-notification';
        notification.innerHTML = `
            <p>Tienes ${count} cambios pendientes de subir al repositorio</p>
            <button id="submit-changes-btn">Exportar cambios</button>
            <button id="clear-changes-btn">Descartar cambios</button>
        `;
        
        // Insertar después del header
        const header = document.querySelector('header');
        header.parentNode.insertBefore(notification, header.nextSibling);
        
        // Añadir eventos a los botones
        document.getElementById('submit-changes-btn').addEventListener('click', exportChanges);
        document.getElementById('clear-changes-btn').addEventListener('click', clearPendingChanges);
    }

    // Función para exportar los cambios (para el administrador)
    function exportChanges() {
        const pendingMovies = JSON.parse(localStorage.getItem('pendingMovies') || '[]');
        
        if (pendingMovies.length === 0) {
            alert('No hay cambios pendientes para exportar.');
            return;
        }
        
        // Crear un archivo JSON para descargar
        const dataStr = JSON.stringify(pendingMovies, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `cambios_pendientes_${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        // Mostrar instrucciones
        const instructions = `
El archivo ${exportFileDefaultName} se ha descargado con éxito.

Para procesar estos cambios en el repositorio:

1. Crea un nuevo archivo llamado 'update-movies.js' en la raíz del repositorio.
2. Abre una terminal en la ubicación del repositorio.
3. Ejecuta: node update-csv.js ${exportFileDefaultName}
4. Verifica que el archivo movies.csv se haya actualizado.
5. Realiza un commit y un push con los cambios.
        `;
        
        alert(instructions);
        
        if (confirm('¿Quieres eliminar los cambios pendientes después de exportarlos?')) {
            localStorage.removeItem('pendingMovies');
            location.reload(); // Recargar la página para actualizar la vista
        }
    }

    // Función para descartar los cambios pendientes
    function clearPendingChanges() {
        if (confirm('¿Estás seguro de que quieres descartar todos los cambios pendientes? Esta acción no se puede deshacer.')) {
            localStorage.removeItem('pendingMovies');
            location.reload(); // Recargar la página para actualizar la vista
        }
    }

    async function updateMovieInCSV(movie, index) {
        try {
            // Obtener la película original
            const originalMovie = allMovies[index];
            
            // Obtener películas pendientes del localStorage
            const pendingMovies = JSON.parse(localStorage.getItem('pendingMovies') || '[]');
            
            // Añadir la actualización a la lista de pendientes
            pendingMovies.push({
                action: 'update',
                data: movie,
                originalData: originalMovie,
                timestamp: Date.now()
            });
            
            // Guardar en localStorage
            localStorage.setItem('pendingMovies', JSON.stringify(pendingMovies));
            
            // Mostrar mensaje de éxito simplificado (para usuarios normales)
            alert('Contenido actualizado correctamente. ¡Gracias por tu contribución!');
            
            return Promise.resolve();
        } catch (error) {
            console.error('Error in updateMovieInCSV:', error);
            return Promise.reject(error);
        }
    }

    function displayError(message) {
        moviesList.innerHTML = `<tr><td colspan="9" class="error-message">${message}</td></tr>`;
    }
});
