class AccessGuard {
    static init() {
        document.body.style.visibility = 'hidden';

        const needsAdmin = !!document.getElementById('accesoDenegadoModal');
        const needsUser  = !!document.getElementById('accessDeniedModal');

        auth.onAuthStateChanged(async user => {
            if (!user) {
                document.body.style.visibility = 'visible';
                if (needsUser) {
                    const modal = new bootstrap.Modal(document.getElementById('accessDeniedModal'));
                    modal.show();
                    document.getElementById('redirectLoginBtn')
                        ?.addEventListener('click', () => { window.location.href = 'Login.html'; });
                    document.getElementById('accessDeniedModal')
                        .addEventListener('hidden.bs.modal', () => { window.location.href = 'Login.html'; });
                } else if (needsAdmin) {
                    window.location.href = 'Login.html';
                }
                return;
            }

            if (needsAdmin) {
                const snap = await db.collection('users').doc(user.uid).get();
                if (snap.data()?.role !== 'admin') {
                    document.body.style.visibility = 'visible';
                    const modal = new bootstrap.Modal(document.getElementById('accesoDenegadoModal'));
                    modal.show();
                    document.getElementById('cerrarModalBtn')
                        ?.addEventListener('click', () => { window.location.href = 'Inicio.html'; });
                    setTimeout(() => { window.location.href = 'Inicio.html'; }, 2000);
                    return;
                }
            }

            document.body.style.visibility = 'visible';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => AccessGuard.init());
