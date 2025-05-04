const fs = require('fs');
const path = require('path');

// Función principal para actualizar el CSV
async function updateMoviesCSV() {
    try {
        // Determinar si se está ejecutando desde GitHub Actions o localmente
        let pendingChanges;
        
        // Si se proporciona un archivo JSON como argumento, usarlo
        if (process.argv.length > 2) {
            const jsonFilePath = process.argv[2];
            console.log(`Procesando archivo de cambios: ${jsonFilePath}`);
            
            if (!fs.existsSync(jsonFilePath)) {
                console.error(`El archivo ${jsonFilePath} no existe`);
                process.exit(1);
            }
            
            // Leer el archivo JSON
            const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
            pendingChanges = JSON.parse(jsonContent);
        } 
        // Si no, intentar obtener del payload de GitHub Actions
        else if (process.env.GITHUB_EVENT_PATH) {
            console.log('Procesando desde GitHub Actions');
            const eventPayload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
            
            if (!eventPayload || !eventPayload.client_payload) {
                console.error('No se encontró payload válido en el evento');
                process.exit(1);
            }
            
            pendingChanges = eventPayload.client_payload.pendingMovies;
        } else {
            console.error('No se proporcionó ninguna fuente de datos');
            console.log('Uso: node update-csv.js [archivo-cambios.json]');
            process.exit(1);
        }
        
        if (!pendingChanges || !Array.isArray(pendingChanges) || pendingChanges.length === 0) {
            console.error('No se encontraron cambios pendientes para procesar');
            process.exit(1);
        }
        
        console.log(`Procesando ${pendingChanges.length} cambios pendientes...`);
        
        // Leer el archivo CSV actual
        const csvPath = path.join(__dirname, 'movies.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        
        // Parsear el CSV a un array de objetos
        const movies = parseCSV(csvContent);
        
        // Aplicar los cambios pendientes
        pendingChanges.forEach(change => {
            if (change.action === 'add') {
                console.log(`Añadiendo: ${change.data.Título}`);
                movies.push(change.data);
            } else if (change.action === 'update') {
                console.log(`Actualizando: ${change.data.Título}`);
                // Buscar la película a actualizar (por título y fecha)
                const index = movies.findIndex(m => 
                    m.Título === change.originalData.Título && 
                    m['Fecha de Petición'] === change.originalData['Fecha de Petición']);
                
                if (index !== -1) {
                    movies[index] = change.data;
                } else {
                    console.warn(`No se encontró la película para actualizar: ${change.data.Título}`);
                }
            }
        });
        
        // Convertir el array de películas de nuevo a CSV
        const newCsvContent = convertToCSV(movies);
        
        // Escribir el nuevo contenido CSV al archivo
        fs.writeFileSync(csvPath, newCsvContent, 'utf8');
        
        console.log('Archivo CSV actualizado correctamente');
        
    } catch (error) {
        console.error('Error al actualizar el CSV:', error);
        process.exit(1);
    }
}

// Función para parsear CSV a array de objetos
function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split('\t');
    
    return lines.slice(1)
        .filter(line => line.trim() !== '')
        .map(line => {
            const values = line.split('\t');
            const movie = {};
            
            headers.forEach((header, index) => {
                movie[header.trim()] = values[index] ? values[index].trim() : '';
            });
            
            return movie;
        });
}

// Función para convertir array de objetos a CSV
function convertToCSV(movies) {
    if (movies.length === 0) {
        return '';
    }
    
    // Obtener los headers del primer objeto
    const headers = Object.keys(movies[0]);
    
    // Crear la línea de headers
    let csvContent = headers.join('\t') + '\n';
    
    // Añadir cada película como una línea
    movies.forEach(movie => {
        const values = headers.map(header => movie[header] || '');
        csvContent += values.join('\t') + '\n';
    });
    
    return csvContent;
}

// Ejecutar la función principal
updateMoviesCSV();