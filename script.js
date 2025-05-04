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
    
    // Track the current row being edited
    let currentEditRow = null;

    // Load movies data from CSV
    fetchMoviesData();

    // Event listeners
    addBtn.addEventListener('click', () => {
        addModal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        addModal.style.display = 'none';
    });

    editCloseBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === addModal) {
            addModal.style.display = 'none';
        }
        if (e.target === editModal) {
            editModal.style.display = 'none';
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

    // Functions
    async function fetchMoviesData() {
        try {
            const response = await fetch('movies.csv');
            const csvText = await response.text();
            const movies = parseCSV(csvText);
            displayMovies(movies);
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

    function displayMovies(movies) {
        moviesList.innerHTML = '';
        
        if (movies.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="9" class="empty-message">No hay contenido disponible</td>';
            moviesList.appendChild(emptyRow);
            return;
        }
        
        movies.forEach((movie, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            
            row.innerHTML = `
                <td>${movie.Título || ''}</td>
                <td>${movie['Subiendo al Servidor'] || 'No'}</td>
                <td>${movie['En Servidor'] || 'No'}</td>
                <td>${movie['Petición de'] || ''}</td>
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
    }

    function getMoviesFromTable() {
        const rows = moviesList.querySelectorAll('tr');
        const movies = [];
        
        rows.forEach(row => {
            if (!row.querySelector('.empty-message')) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 8) {
                    const movie = {
                        'Título': cells[0].textContent,
                        'Subiendo al Servidor': cells[1].textContent,
                        'En Servidor': cells[2].textContent,
                        'Petición de': cells[3].textContent,
                        'Comentarios': cells[4].textContent,
                        'Es Serie': cells[5].textContent,
                        'Temporadas': cells[6].textContent,
                        'Año de Lanzamiento': cells[7].textContent
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
            'Comentarios': document.getElementById('edit-comments').value,
            'Es Serie': document.getElementById('edit-is-series').value,
            'Temporadas': document.getElementById('edit-is-series').value === 'Sí' ? document.getElementById('edit-seasons').value : '',
            'Año de Lanzamiento': document.getElementById('edit-release-year').value
        };
        
        try {
            await updateMovieInCSV(updatedMovie, currentEditRow);
            editModal.style.display = 'none';
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

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const newMovie = {
            'Título': document.getElementById('title').value,
            'Subiendo al Servidor': document.getElementById('uploading').value,
            'En Servidor': document.getElementById('on-server').value,
            'Petición de': document.getElementById('requested-by').value,
            'Comentarios': document.getElementById('comments').value,
            'Es Serie': document.getElementById('is-series').value,
            'Temporadas': document.getElementById('is-series').value === 'Sí' ? document.getElementById('seasons').value : '',
            'Año de Lanzamiento': document.getElementById('release-year').value
        };
        
        try {
            await addMovieToCSV(newMovie);
            addModal.style.display = 'none';
            addForm.reset();
            fetchMoviesData(); // Refresh the list
        } catch (error) {
            console.error('Error adding movie:', error);
            alert('Error al añadir el contenido. Inténtalo de nuevo.');
        }
    }

    async function addMovieToCSV(movie) {
        try {
            // In a real implementation, this would send data to a server endpoint
            // which would handle the GitHub operations
            // For now, we simulate a successful addition
            console.log('Adding movie:', movie);
            
            // In a real implementation, we would:
            // 1. Fetch the current CSV
            // 2. Add the new entry
            // 3. Create a PR via GitHub API
            
            // For demonstration, we'll show an alert of success
            alert('Contenido añadido correctamente. El servidor procesará la solicitud.');
            
            // This is a placeholder for the actual implementation
            return Promise.resolve();
        } catch (error) {
            console.error('Error in addMovieToCSV:', error);
            return Promise.reject(error);
        }
    }

    async function updateMovieInCSV(movie, index) {
        try {
            // Similar to addMovieToCSV, but for updating
            console.log('Updating movie at index', index, 'with data:', movie);
            
            // In a real implementation, we would:
            // 1. Fetch the current CSV
            // 2. Update the entry at the specified index
            // 3. Create a PR via GitHub API
            
            // For demonstration, we'll show an alert of success
            alert('Contenido actualizado correctamente. El servidor procesará la solicitud.');
            
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
