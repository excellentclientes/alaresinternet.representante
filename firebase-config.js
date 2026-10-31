/* ============================================================
   FIREBASE – configuração do projeto "alares-internet"
   Este é o ÚNICO arquivo que mexe com as chaves do Firebase.
   (Script comum, sem build: funciona no GitHub Pages e também
   abrindo o index.html direto no computador.)
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyA-FecHdgpyWVKzBz-kfUjiEEmyUGTbUSk",
  authDomain: "alares-internet.firebaseapp.com",
  projectId: "alares-internet",
  storageBucket: "alares-internet.firebasestorage.app",
  messagingSenderId: "943264601879",
  appId: "1:943264601879:web:b68a545c7eb610c9a84952"
};

(function () {
  var V = "10.14.1";
  var BASE = "https://www.gstatic.com/firebasejs/" + V + "/";
  var appP, fsP, authP;

  function app() {
    if (!appP) {
      appP = import(BASE + "firebase-app.js").then(function (m) {
        return m.initializeApp(window.FIREBASE_CONFIG);
      });
    }
    return appP;
  }

  window.alaresFirebase = {
    /* Banco de dados (Firestore): usado pelo site e pelo painel */
    firestore: function () {
      if (!fsP) {
        fsP = Promise.all([app(), import(BASE + "firebase-firestore.js")]).then(function (r) {
          var a = r[0], fs = r[1];
          var db = fs.initializeFirestore(a, { experimentalAutoDetectLongPolling: true });
          return { app: a, db: db, fs: fs };
        });
      }
      return fsP;
    },
    /* Login (Authentication): usado só pelo painel */
    auth: function () {
      if (!authP) {
        authP = Promise.all([app(), import(BASE + "firebase-auth.js")]).then(function (r) {
          return { auth: r[1].getAuth(r[0]), a: r[1] };
        });
      }
      return authP;
    }
  };
})();
