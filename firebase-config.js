// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCmBNiCZiSX6voEk6wkT4D5jcukniUUVHo",
    authDomain: "friendflixdb.firebaseapp.com",
    projectId: "friendflixdb",
    storageBucket: "friendflixdb.firebasestorage.app",
    messagingSenderId: "364480978794",
    appId: "1:364480978794:web:0dd75a34e9da269ef98f13",
    measurementId: "G-LCT4MS8ZPG"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias de la base de datos
const db = firebase.firestore();

// Configuración para mantenerlo gratis
// Deshabilitar la caché persistente para reducir operaciones de escritura
firebase.firestore().settings({
  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Habilitar caché offline para reducir lecturas
firebase.firestore().enablePersistence({
  synchronizeTabs: true
}).catch(err => {
  console.error("Error habilitando persistencia:", err);
});

const moviesCollection = db.collection('movies');

// Exportar las referencias para usar en otros archivos
export { db, moviesCollection };