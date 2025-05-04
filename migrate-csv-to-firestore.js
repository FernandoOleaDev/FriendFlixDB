// Script para migrar datos de CSV a Firestore
// Uso: node migrate-csv-to-firestore.js

// Importar Firebase
const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');
const fs = require('fs');

// Configuración de Firebase (la misma que en firebase-config.js)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Reemplaza con tu API key real
  authDomain: "friendflixdb.firebaseapp.com", // Reemplaza con tu authDomain real
  projectId: "friendflixdb", // Reemplaza con tu projectId real
  storageBucket: "friendflixdb.appspot.com", // Reemplaza con tu storageBucket real
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Reemplaza con tu messagingSenderId real
  appId: "YOUR_APP_ID" // Reemplaza con tu appId real
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Optimizar para plan gratuito limitando el tamaño del lote
// Firestore gratuito tiene límites de tasa de operaciones
const moviesCollection = db.collection('movies');

// Función para obtener la fecha actual en formato legible
function getCurrentDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
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

// Función para esperar un tiempo determinado (evitar exceder límites de operaciones)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Función principal para migrar datos
async function migrateCSVToFirestore() {
  try {
    console.log('Iniciando migración de datos...');
    
    // Leer el archivo CSV
    const csvText = fs.readFileSync('movies.csv', 'utf8');
    const movies = parseCSV(csvText);
    
    console.log(`Se encontraron ${movies.length} registros para migrar.`);
    
    // Usar batch para mejor rendimiento pero con tamaño más pequeño para optimizar plan gratuito
    const batchSize = 100; // Reducido de 500 para ajustarse mejor al plan gratuito
    let batchCount = 0;
    let totalMigrated = 0;
    
    // Dividir los registros en batches
    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = db.batch();
      const currentBatch = movies.slice(i, i + batchSize);
      
      console.log(`Procesando batch ${++batchCount} (${currentBatch.length} registros)...`);
      
      // Añadir cada película al batch
      currentBatch.forEach(movie => {
        const docRef = moviesCollection.doc(); // Generar ID automático
        movie['Fecha de Migración'] = getCurrentDate();
        batch.set(docRef, movie);
      });
      
      // Guardar el batch
      await batch.commit();
      totalMigrated += currentBatch.length;
      console.log(`Batch ${batchCount} completado (Total: ${totalMigrated}/${movies.length})`);
      
      // Esperar un poco entre batches para evitar superar límites de escritura
      if (i + batchSize < movies.length) {
        console.log('Esperando 5 segundos antes del próximo batch para respetar límites de operaciones...');
        await sleep(5000);
      }
    }
    
    console.log('¡Migración completada con éxito!');
    console.log(`Se han migrado ${totalMigrated} registros a Firestore.`);
    
    // Cerrar la conexión de Firebase
    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar la migración
migrateCSVToFirestore();