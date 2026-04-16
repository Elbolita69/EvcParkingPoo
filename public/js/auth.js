class AuthManager {
    constructor() {
        this.#bindEvents();
        this.#showTab('login');
    }

    #bindEvents() {
        document.getElementById('btn__iniciar-sesion').addEventListener('click', () => this.#showTab('login'));
        document.getElementById('btn__registrarse').addEventListener('click', () => this.#showTab('register'));
        document.getElementById('btn__submit-login').addEventListener('click', () => this.#login());
        document.getElementById('btn__submit-register').addEventListener('click', () => this.#register());
    }

    #showTab(tab) {
        const loginForm    = document.getElementById('form_login');
        const registerForm = document.getElementById('form_register');
        const loginBtn     = document.getElementById('btn__iniciar-sesion');
        const registerBtn  = document.getElementById('btn__registrarse');
        const isLogin      = tab === 'login';
        loginForm.style.display    = isLogin ? 'block' : 'none';
        registerForm.style.display = isLogin ? 'none' : 'block';
        loginBtn.classList.toggle('active', isLogin);
        registerBtn.classList.toggle('active', !isLogin);
    }

    #showModal(modalId) {
        new bootstrap.Modal(document.getElementById(modalId)).show();
    }

    #showModalMsg(modalId, msg) {
        const el = document.getElementById(modalId);
        const p  = el.querySelector('.modal-body p');
        if (p) p.textContent = msg;
        new bootstrap.Modal(el).show();
    }

    async #login() {
        const email    = document.getElementById('login_email').value.trim();
        const password = document.getElementById('login_password').value;
        try {
            const cred = await auth.signInWithEmailAndPassword(email, password);
            const snap = await db.collection('users').doc(cred.user.uid).get();
            const role = snap.data()?.role || 'regular';
            this.#showModal('inicioSesionExitosoModal');
            setTimeout(() => {
                window.location.href = role === 'admin' ? 'Admin.html' : 'Inicio.html';
            }, 2000);
        } catch {
            this.#showModal('correoContraseñaIncorrectosModal');
        }
    }

    async #register() {
        const nombre   = document.getElementById('register_nombre').value.trim();
        const email    = document.getElementById('register_email').value.trim();
        const usuario  = document.getElementById('register_usuario').value.trim();
        const password = document.getElementById('register_password').value;

        if (!nombre || !email || !usuario || !password) {
            this.#showModal('correoContraseñaIncorrectosModal');
            return;
        }

        try {
            const cred  = await auth.createUserWithEmailAndPassword(email, password);
            const check = await db.collection('users').limit(1).get();
            const role  = check.empty ? 'admin' : 'regular';
            await db.collection('users').doc(cred.user.uid).set({
                nombre, usuario, email, role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.#showModal('registroExitosoModal');
            document.getElementById('form_register').reset();
            this.#showTab('login');
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                this.#showModal('correoYaRegistradoModal');
            } else if (e.code === 'auth/operation-not-allowed') {
                this.#showModalMsg('correoContraseñaIncorrectosModal',
                    'El proveedor email/contraseña no está habilitado en Firebase Console.');
            } else if (e.code === 'auth/weak-password') {
                this.#showModalMsg('correoContraseñaIncorrectosModal',
                    'La contraseña debe tener al menos 6 caracteres.');
            } else {
                this.#showModalMsg('correoContraseñaIncorrectosModal',
                    `Error: ${e.message}`);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new AuthManager());
