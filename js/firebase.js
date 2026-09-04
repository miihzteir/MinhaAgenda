// Login com Google/e-mail e sincronização com o Firestore — tudo opcional.
// Se js/firebase-config.js não tiver as chaves preenchidas, ou se o Firebase
// não puder ser carregado (sem internet, CDN bloqueado etc.), o app inteiro
// continua funcionando normalmente no modo local (localStorage).
import { store } from './store.js';
import { FIREBASE_CONFIG } from './firebase-config.js';

const SDK_VERSION = '10.13.0';
const isConfigured = Boolean(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith('COLE_'));

export const authState = { user: null, ready: !isConfigured, configured: isConfigured, syncStatus: 'local' };

let api = null; // { auth, db, authMod, fsMod } depois de carregado
let unsubSnapshot = null;
let saveTimer = null;

function notify() {
  document.dispatchEvent(new Event('auth-changed'));
}

async function ensureFirebase() {
  if (!isConfigured) return null;
  if (api) return api;
  try {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
    ]);
    const app = initializeApp(FIREBASE_CONFIG);
    const auth = authMod.getAuth(app);
    const db = fsMod.getFirestore(app);
    api = { app, auth, db, authMod, fsMod };
    authMod.onAuthStateChanged(auth, (user) => {
      authState.user = user;
      authState.ready = true;
      if (user) {
        startSync(user.uid);
        // Guarda a foto e o nome do Google no perfil local, pra aparecerem
        // mesmo offline ou antes da sincronização terminar.
        const profile = store.get().profile;
        const patch = {};
        if (user.photoURL && user.photoURL !== profile.photoURL) patch.photoURL = user.photoURL;
        if (user.displayName && (!profile.name || profile.name === 'Você')) patch.name = user.displayName;
        if (Object.keys(patch).length) store.updateProfile(patch);
      } else {
        stopSync();
      }
      notify();
    });
    return api;
  } catch (err) {
    console.warn('Minha Agenda: não foi possível carregar o Firebase agora — seguindo no modo local.', err);
    authState.ready = true;
    notify();
    return null;
  }
}

function startSync(uid) {
  const { db, fsMod } = api;
  const ref = fsMod.doc(db, 'users', uid);

  unsubSnapshot = fsMod.onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      store._applyRemote(snap.data());
    } else {
      fsMod.setDoc(ref, store.get()).catch(() => {});
    }
    authState.syncStatus = 'synced';
    notify();
  }, () => {
    authState.syncStatus = 'local';
    notify();
  });

  store._setRemotePush((data) => {
    authState.syncStatus = 'syncing';
    notify();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      fsMod.setDoc(ref, data).then(() => {
        authState.syncStatus = 'synced';
        notify();
      }).catch(() => {
        authState.syncStatus = 'local';
        notify();
      });
    }, 700);
  });
}

function stopSync() {
  if (unsubSnapshot) unsubSnapshot();
  unsubSnapshot = null;
  store._setRemotePush(null);
  authState.syncStatus = 'local';
}

export async function signInWithGoogle() {
  const a = await ensureFirebase();
  if (!a) throw new Error('Firebase não configurado.');
  const provider = new a.authMod.GoogleAuthProvider();
  return a.authMod.signInWithPopup(a.auth, provider);
}

export async function signInWithEmail(email, password) {
  const a = await ensureFirebase();
  if (!a) throw new Error('Firebase não configurado.');
  return a.authMod.signInWithEmailAndPassword(a.auth, email, password);
}

export async function registerWithEmail(email, password) {
  const a = await ensureFirebase();
  if (!a) throw new Error('Firebase não configurado.');
  return a.authMod.createUserWithEmailAndPassword(a.auth, email, password);
}

export async function signOutUser() {
  if (!api) return;
  await api.authMod.signOut(api.auth);
}

// Se já tem chaves configuradas, tenta restaurar a sessão assim que o app abre.
if (isConfigured) ensureFirebase();
