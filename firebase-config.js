// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCmBNiCZiSX6voEk6wkT4D5jcukniUUVHo",
    authDomain: "friendflixdb.firebaseapp.com",
    projectId: "friendflixdb",
    storageBucket: "friendflixdb.appspot.com", // Corregido el dominio del bucket
    messagingSenderId: "364480978794",
    appId: "1:364480978794:web:0dd75a34e9da269ef98f13",
    measurementId: "G-LCT4MS8ZPG"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias de la base de datos
const db = firebase.firestore();

// Configuración para mantenerlo gratis
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Habilitar caché offline para reducir lecturas
firebase.firestore().enablePersistence({
    synchronizeTabs: true
}).catch(err => {
    if (err.code === 'failed-precondition') {
        // Múltiples pestañas abiertas, no se puede habilitar persistencia
        console.log("No se puede habilitar la persistencia porque hay múltiples pestañas abiertas.");
    } else if (err.code === 'unimplemented') {
        // El navegador actual no soporta persistencia
        console.log("El navegador actual no soporta persistencia offline.");
    } else {
        console.error("Error habilitando persistencia:", err);
    }
});

const moviesCollection = db.collection('movies');

// Exportar las referencias para usar en otros archivos
export { db, moviesCollection };