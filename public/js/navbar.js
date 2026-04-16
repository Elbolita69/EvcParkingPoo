class NavbarManager {
    constructor() {
        auth.onAuthStateChanged(user => {
            if (user) {
                db.collection('users').doc(user.uid).get().then(snap => {
                    const data = snap.data() || {};
                    this.#updateLoginBtn(true);
                    this.#updateGreeting(data.nombre || '');
                    if (data.role === 'admin') this.#addAdminItems();
                });
            } else {
                this.#updateLoginBtn(false);
            }
        });
    }

    #updateLoginBtn(loggedIn) {
        const btn = document.getElementById('loginBtn');
        if (!btn) return;
        if (loggedIn) {
            btn.innerHTML = '<i class="fa-solid fa-right-from-bracket me-1"></i>Cerrar Sesión';
            btn.href = '#';
            btn.addEventListener('click', e => { e.preventDefault(); this.#logout(); });
        } else {
            btn.innerHTML = '<i class="fa-solid fa-right-to-bracket me-1"></i>Login';
            btn.href = 'Login.html';
        }
    }

    #updateGreeting(nombre) {
        const el = document.getElementById('nombreUsuario');
        if (el && nombre) el.textContent = `Hola, ${nombre}!`;
    }

    #logout() {
        auth.signOut().then(() => {
            const modalEl = document.getElementById('sesionCerradaModal');
            if (modalEl) {
                new bootstrap.Modal(modalEl).show();
                setTimeout(() => { window.location.href = 'Login.html'; }, 2000);
            } else {
                window.location.href = 'Login.html';
            }
        });
    }

    #addAdminItems() {
        const nav = document.querySelector('#navbarNav .navbar-nav');
        if (!nav) return;

        const items = [
            { href: 'Admin.html',          text: 'Admin',   icon: 'fa-solid fa-shield-halved' },
            { href: 'Estadisticas.html',   text: 'Gráficas',icon: 'fa-solid fa-chart-pie' },
            { href: 'GestionPuestos.html', text: 'Puestos', icon: 'fa-solid fa-map-pin' },
            { href: 'Cameras.html', text: 'Cámaras', icon: 'fa-solid fa-camera' }
        ];

        const anchor = nav.querySelector("a[href='Parking.html']")?.parentElement
                    ?? nav.querySelector("a[href='./Parking.html']")?.parentElement;

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.innerHTML = `<a class="nav-link" href="${item.href}"><i class="${item.icon} me-1"></i>${item.text}</a>`;
            if (anchor) anchor.insertAdjacentElement('afterend', li);
            else nav.appendChild(li);
        });

        const faqEl = nav.querySelector("a[href='Faq.html']")
                   ?? nav.querySelector("a[href='./Faq.html']");
        if (faqEl) faqEl.parentElement.remove();
    }
}

document.addEventListener('DOMContentLoaded', () => new NavbarManager());
