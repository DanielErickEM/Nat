'use strict';
(async () => {
  try {
    const { startUniverse } = await import('./universe-3d.js?v=cinema-5');
    await startUniverse();
  } catch (error) {
    console.warn('El modo 3D no está disponible; se activa la galaxia compatible.', error);
    document.body.classList.remove('is-3d');
    const old = document.querySelector('#cosmos');
    old.replaceWith(old.cloneNode(false));
    const media = document.querySelector('#orbit-photos');
    media.querySelector('video')?.pause(); media.replaceChildren(); media.classList.remove('media-accessible');
    document.querySelector('.sun-name').removeAttribute('style');
    const fallback = document.createElement('script'); fallback.src = 'fallback.js?v=cinema-5'; document.head.append(fallback);
  }
})();
