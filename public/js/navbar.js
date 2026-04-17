class NavbarManager {
    constructor() {
        auth.onAuthStateChanged(user => {
            if (user) {
                db.collection('users').doc(user.uid).get().then(snap => {
                    const data = snap.data() || {};
                    this.#updateLoginBtn(true);
                    this.#showGreeting(data.nombre || '');
                    if (data.role === 'admin') this.#addAdminDropdown();
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

    #showGreeting(nombre) {
        const el = document.getElementById('nombreUsuario');
        if (!el || !nombre) return;
        el.textContent = `Hola, ${nombre}!`;
        el.classList.add('visible');
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

    #addAdminDropdown() {
        const nav = document.querySelector('#navbarNav .navbar-nav');
        if (!nav || nav.querySelector('#adminDropdown')) return;

        const page    = window.location.pathname.split('/').pop();
        const onAdmin = ['Admin.html','Estadisticas.html','GestionPuestos.html','Cameras.html'].includes(page);

        const li = document.createElement('li');
        li.className = 'nav-item dropdown';
        li.innerHTML = `
          <a class="nav-link dropdown-toggle${onAdmin ? ' active' : ''}" href="#"
             id="adminDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="fa-solid fa-shield-halved me-1"></i>Admin
          </a>
          <ul class="dropdown-menu" aria-labelledby="adminDropdown">
            <li><a class="dropdown-item${page==='Admin.html'?' active':''}" href="Admin.html">
              <i class="fa-solid fa-users-gear me-2"></i>Usuarios</a></li>
            <li><a class="dropdown-item${page==='GestionPuestos.html'?' active':''}" href="GestionPuestos.html">
              <i class="fa-solid fa-map-pin me-2"></i>Puestos</a></li>
            <li><a class="dropdown-item${page==='Estadisticas.html'?' active':''}" href="Estadisticas.html">
              <i class="fa-solid fa-chart-pie me-2"></i>Estadísticas</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item${page==='Cameras.html'?' active':''}" href="Cameras.html">
              <i class="fa-solid fa-camera me-2"></i>Cámaras</a></li>
          </ul>`;

        const dividerLi = nav.querySelector('.nav-divider')?.closest('li')
                       ?? nav.querySelector('#loginBtn')?.closest('li');
        if (dividerLi) dividerLi.insertAdjacentElement('beforebegin', li);
        else nav.appendChild(li);
    }
}

document.addEventListener('DOMContentLoaded', () => new NavbarManager());
