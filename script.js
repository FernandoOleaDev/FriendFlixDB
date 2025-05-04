// Importar configuración de Firebase
import { db, moviesCollection } from './firebase-config.js';

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
    
    // Contraseña de admin (debería almacenarse de manera más segura)
    const ADMIN_PASSWORD = "friendflix123";
    // Contraseña para clientes/usuarios regulares
    const CLIENT_PASSWORD = "amigo2025";
    
    // Track the current movie being edited
    let currentMovieId = null;
    // Variable para almacenar las películas
    let allMovies = [];
    // Variable para rastrear estado de admin
    let isAdmin = false;
    // Variable para rastrear si el usuario ha ingresado como cliente
    let isClientAuthenticated = false;
    // Variable para almacenar la última consulta de Firestore
    let firestoreUnsubscribe = null;

    // Verificar conexión a Firebase - Debug
    console.log("Iniciando aplicación...");
    console.log("Estado de Firebase:", db ? "Inicializado" : "No inicializado");

    // Comprobar si el usuario ya está en modo admin o autenticado como cliente
    checkUserStatus();

    // Si el usuario no está autenticado como cliente ni como admin, mostrar prompt de contraseña
    if (!isClientAuthenticated && !isAdmin) {
        showClientAuthPrompt();
    } else {
        // Cargar películas desde Firestore con manejo de errores mejorado
        window.setTimeout(() => {
            loadMoviesFromFirestore();
        }, 500); // Pequeño retraso para asegurar que Firebase esté listo
    }

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
            isAdmin = true;
            // Actualizar UI
            adminBtn.classList.add('admin-active');
            adminModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            
            alert('¡Modo administrador activado!');
            // Actualizar la vista para mostrar controles de admin
            displayMovies(allMovies);
        } else {
            alert('Contraseña incorrecta');
        }
    }

    function checkUserStatus() {
        isAdmin = localStorage.getItem('isAdmin') === 'true';
        isClientAuthenticated = sessionStorage.getItem('isClientAuthenticated') === 'true';
        
        if (isAdmin) {
            adminBtn.classList.add('admin-active');
        }
    }

    function showClientAuthPrompt() {
        // Mostrar el modal de autenticación de cliente
        const clientAuthModal = document.getElementById('client-auth-modal');
        clientAuthModal.style.display = 'block';
        document.body.classList.add('modal-open');
        
        // Configurar el formulario de autenticación
        const clientAuthForm = document.getElementById('client-auth-form');
        
        clientAuthForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const password = document.getElementById('client-password').value;
            
            if (password === CLIENT_PASSWORD) {
                // Guardar estado de cliente autenticado en sessionStorage (dura la sesión)
                sessionStorage.setItem('isClientAuthenticated', 'true');
                isClientAuthenticated = true;
                
                // Cerrar el modal
                clientAuthModal.style.display = 'none';
                document.body.classList.remove('modal-open');
                
                alert('¡Bienvenido a FriendFlixDB!');
                
                // Cargar películas desde Firestore
                loadMoviesFromFirestore();
            } else {
                alert('Contraseña incorrecta. Por favor, inténtalo de nuevo.');
            }
        });
    }

    // Función para obtener todas las películas de Firestore
    async function loadMoviesFromFirestore() {
        try {
            // Cancelar cualquier suscripción previa
            if (firestoreUnsubscribe) {
                firestoreUnsubscribe();
            }

            // Mostrar mensaje de carga
            moviesList.innerHTML = '<tr><td colspan="10" class="loading-message">Cargando datos...</td></tr>';
            
            // Verificar que Firestore está inicializado
            if (!db || !moviesCollection) {
                console.error("Firebase no está inicializado correctamente");
                displayError('Error de conexión a la base de datos. Recarga la página e intenta nuevamente.');
                return;
            }

            console.log("Intentando cargar datos desde Firestore...");

            // Obtener datos de forma más simple para diagnóstico
            try {
                const snapshot = await moviesCollection.get();
                console.log("Consulta realizada, resultados:", snapshot.size);
                
                allMovies = [];
                
                if (snapshot.empty) {
                    console.log("No hay documentos en la colección");
                    displayMovies([]);
                    return;
                }

                snapshot.forEach((doc) => {
                    if (doc.exists) {
                        const movieData = doc.data();
                        const movie = {
                            id: doc.id,
                            ...movieData
                        };
                        allMovies.push(movie);
                    }
                });
                
                console.log(`Películas cargadas: ${allMovies.length}`);
                
                // Mostrar los datos
                displayMovies(allMovies);
                
                // Ahora configurar el listener en tiempo real
                setupRealtimeListener();
                
            } catch (error) {
                console.error("Error obteniendo datos iniciales:", error);
                displayError(`Error al obtener datos: ${error.message}`);
            }
        } catch (error) {
            console.error('Error general:', error);
            displayError('Error al cargar los datos. Intenta más tarde.');
        }
    }
    
    // Configura el listener en tiempo real después de la carga inicial
    function setupRealtimeListener() {
        try {
            // Cancelar suscripción anterior si existe
            if (firestoreUnsubscribe) {
                firestoreUnsubscribe();
            }
            
            firestoreUnsubscribe = moviesCollection
                .onSnapshot(
                    (snapshot) => {
                        try {
                            // Solo procesar cambios, no toda la colección
                            let hasChanges = false;
                            
                            snapshot.docChanges().forEach((change) => {
                                hasChanges = true;
                                const doc = change.doc;
                                const movieData = doc.data();
                                const movie = {
                                    id: doc.id,
                                    ...movieData
                                };
                                
                                if (change.type === "added") {
                                    // Verificar si ya está en la lista (para evitar duplicados)
                                    const existingIndex = allMovies.findIndex(m => m.id === movie.id);
                                    if (existingIndex === -1) {
                                        allMovies.push(movie);
                                    }
                                } else if (change.type === "modified") {
                                    // Actualizar película existente
                                    const index = allMovies.findIndex(m => m.id === movie.id);
                                    if (index !== -1) {
                                        allMovies[index] = movie;
                                    }
                                } else if (change.type === "removed") {
                                    // Eliminar película
                                    const index = allMovies.findIndex(m => m.id === movie.id);
                                    if (index !== -1) {
                                        allMovies.splice(index, 1);
                                    }
                                }
                            });
                            
                            // Solo actualizar la interfaz si hubo cambios
                            if (hasChanges) {
                                console.log("Cambios detectados, actualizando UI");
                                displayMovies(allMovies);
                            }
                        } catch (parseError) {
                            console.error("Error procesando cambios:", parseError);
                        }
                    }, 
                    (error) => {
                        console.error("Error en listener en tiempo real:", error);
                    }
                );
                
            console.log("Listener en tiempo real configurado");
        } catch (error) {
            console.error("Error configurando listener en tiempo real:", error);
        }
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
        
        sortedMovies.forEach((movie) => {
            const row = document.createElement('tr');
            row.dataset.id = movie.id;
            
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
                    <button class="edit-btn" data-id="${movie.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${isAdmin ? `<button class="delete-btn" data-id="${movie.id}">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </td>
            `;
            
            moviesList.appendChild(row);
        });
        
        // Add edit button event listeners
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', handleEditClick);
        });
        
        // Add delete button event listeners (only for admin)
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDeleteClick);
        });
    }

    function handleEditClick(e) {
        const movieId = e.currentTarget.dataset.id;
        const movie = allMovies.find(m => m.id === movieId);
        
        if (!movie) return;
        
        currentMovieId = movieId;
        
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
        document.body.classList.add('modal-open');
    }
    
    // Función para manejar el clic en el botón de eliminar
    function handleDeleteClick(e) {
        if (!isAdmin) {
            alert('Necesitas ser administrador para eliminar contenido.');
            return;
        }
        
        const movieId = e.currentTarget.dataset.id;
        const movie = allMovies.find(m => m.id === movieId);
        
        if (confirm(`¿Estás seguro de que quieres eliminar "${movie.Título}"?`)) {
            deleteMovie(movieId);
        }
    }
    
    // Función para eliminar una película de Firestore
    async function deleteMovie(movieId) {
        try {
            await moviesCollection.doc(movieId).delete();
            // La UI se actualizará automáticamente gracias al listener onSnapshot
            alert('Contenido eliminado correctamente.');
        } catch (error) {
            console.error('Error al eliminar el contenido:', error);
            alert('Error al eliminar el contenido. Inténtalo de nuevo.');
        }
    }

    async function handleEditFormSubmit(e) {
        e.preventDefault();
        
        if (!currentMovieId) return;
        
        const updatedMovie = {
            'Título': document.getElementById('edit-title').value,
            'Subiendo al Servidor': document.getElementById('edit-uploading').value,
            'En Servidor': document.getElementById('edit-on-server').value,
            'Petición de': document.getElementById('edit-requested-by').value,
            'Fecha de Petición': document.getElementById('edit-request-date').value,
            'Comentarios': document.getElementById('edit-comments').value,
            'Es Serie': document.getElementById('edit-is-series').value,
            'Temporadas': document.getElementById('edit-is-series').value === 'Sí' ? document.getElementById('edit-seasons').value : '',
            'Año de Lanzamiento': document.getElementById('edit-release-year').value,
            'Última Actualización': getCurrentDate(),
            'Actualizado Por': isAdmin ? 'Admin' : 'Usuario'
        };
        
        try {
            await updateMovieInFirestore(currentMovieId, updatedMovie);
            editModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            editForm.reset();
            currentMovieId = null;
            // La UI se actualizará automáticamente gracias al listener onSnapshot
        } catch (error) {
            console.error('Error updating movie:', error);
            alert('Error al actualizar el contenido. Inténtalo de nuevo.');
        }
    }

    // Función para filtrar películas de manera eficiente
    function filterMovies() {
        const searchTerm = searchInput.value.toLowerCase();
        
        if (searchTerm === '') {
            // Si no hay término de búsqueda, recargar desde Firestore para obtener datos frescos
            // pero con un límite para ahorrar operaciones
            loadMoviesFromFirestore();
        } else {
            // Filtrar localmente para ahorrar operaciones de Firestore
            const filteredMovies = allMovies.filter(movie => 
                (movie.Título?.toLowerCase().includes(searchTerm)) ||
                (movie['Petición de']?.toLowerCase().includes(searchTerm))
            );
            displayMovies(filteredMovies);
        }
    }

    // Función para obtener la fecha actual en formato legible
    function getCurrentDate() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}/${month}/${year}`;
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Agregar la fecha actual automáticamente
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
            'Año de Lanzamiento': document.getElementById('release-year').value,
            'Fecha de Creación': currentDate,
            'Creado Por': isAdmin ? 'Admin' : 'Usuario'
        };
        
        try {
            const validatedMovie = Object.entries(newMovie).reduce((acc, [key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    acc[key] = value;
                }
                return acc;
            }, {});
            
            // Actualizar timestamp de rate limit antes de crear película
            try {
                await updateLastWrite();
            } catch (error) {
                console.error("Error en actualización de rate limit:", error);
                alert(`Error en el límite de tasa: ${error.message}`);
                return;
            }
            
            await moviesCollection.add(validatedMovie);
            addModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            addForm.reset();
            // La UI se actualizará automáticamente gracias al listener onSnapshot
        } catch (error) {
            console.error('Error adding movie:', error);
            alert(`Error al añadir el contenido: ${error.message}`);
        }
    }

    // Función para actualizar una película en Firestore de manera eficiente
    async function updateMovieInFirestore(movieId, movie) {
        try {
            const movieRef = moviesCollection.doc(movieId);
            const doc = await movieRef.get();
            const currentData = doc.data();

            const updates = {};
            for (const [key, value] of Object.entries(movie)) {
                if (currentData[key] !== value && value !== null && value !== undefined) {
                    updates[key] = value;
                }
            }

            updates['Última Actualización'] = getCurrentDate();
            updates['Actualizado Por'] = isAdmin ? 'Admin' : 'Usuario';

            if (Object.keys(updates).length > 0) {
                // Actualizar timestamp de rate limit antes de modificar película
                try {
                    await updateLastWrite();
                } catch (error) {
                    console.error("Error en actualización de rate limit:", error);
                    alert(`Error en el límite de tasa: ${error.message}`);
                    return Promise.reject(error);
                }
                
                await movieRef.update(updates);
                alert('Contenido actualizado correctamente.');
            } else {
                alert('No se detectaron cambios.');
            }
        } catch (error) {
            console.error('Error in updateMovieInFirestore:', error);
            alert(`Error al actualizar: ${error.code} - ${error.message}`);
            return Promise.reject(error);
        }
    }

    function displayError(message) {
        moviesList.innerHTML = `<tr><td colspan="10" class="error-message">${message}</td></tr>`;
    }
    
    // Función para migrar datos del CSV a Firestore (solo para administrador)
    async function migrateCSVToFirestore() {
        if (!isAdmin) {
            alert('Necesitas ser administrador para migrar datos.');
            return;
        }
        
        try {
            // Obtener datos del CSV
            const response = await fetch('movies.csv');
            const csvText = await response.text();
            const csvMovies = parseCSV(csvText);
            
            // Contador para seguimiento de migración
            let migratedCount = 0;
            
            // Batch para eficiencia
            const batch = db.batch();
            
            // Añadir cada película a Firestore
            for (const movie of csvMovies) {
                const docRef = moviesCollection.doc();
                batch.set(docRef, {
                    ...movie,
                    'Fecha de Migración': getCurrentDate()
                });
                migratedCount++;
            }
            
            // Ejecutar el batch
            await batch.commit();
            
            alert(`¡Migración completada! Se han migrado ${migratedCount} registros.`);
        } catch (error) {
            console.error('Error en la migración:', error);
            alert('Error al migrar los datos. Revisa la consola para más detalles.');
        }
    }
    
    // Función para parsear CSV
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
    
    // Añadir botón para migración CSV (solo visible para administradores)
    if (isAdmin) {
        const adminControls = document.querySelector('.admin-controls');
        
        const migrateBtn = document.createElement('button');
        migrateBtn.className = 'admin-button migrate-btn';
        migrateBtn.title = 'Migrar CSV a Firestore';
        migrateBtn.innerHTML = '<i class="fas fa-database"></i>';
        
        migrateBtn.addEventListener('click', migrateCSVToFirestore);
        
        adminControls.appendChild(migrateBtn);
    }

    // Función para limpiar recursos al salir de la página
    window.addEventListener('beforeunload', () => {
        // Cancelar suscripciones para evitar fugas de memoria y reducir operaciones innecesarias
        if (firestoreUnsubscribe) {
            firestoreUnsubscribe();
        }
    });
});

const rateLimitDoc = db.collection('metrics').doc('rateLimit');

async function updateLastWrite() {
    try {
        return await rateLimitDoc.set({
            lastWrite: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Error actualizando lastWrite:", error);
        return Promise.reject(error);
    }
}
