// app.js con validación de modelos GLB, mejoras de geolocalización, radar y botón de reintento

let userCoords = { lat: 0, lon: 0 };
let idioma = 'es';
let puntos = [];
let lang = {};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function crearEntidad(punto) {
  const scene = document.querySelector('a-scene');

  // ✅ Validar modelo antes de crear entidad
  if (!punto.modelo || typeof punto.modelo !== 'string') {
    console.warn('⚠️ Modelo no válido o faltante:', punto);
    return;
  }

  const modelo = document.createElement('a-entity');
  modelo.setAttribute('gps-entity-place', `latitude: ${punto.lat}; longitude: ${punto.lon}`);
  modelo.setAttribute('gltf-model', punto.modelo);
  modelo.setAttribute('scale', '1 1 1');
  modelo.setAttribute('rotation', '0 180 0');
  modelo.setAttribute('animation-mixer', '');

  const etiqueta = document.createElement('a-text');
  etiqueta.setAttribute('value', `${punto.nombre[idioma]}\nCalculando...`);
  etiqueta.setAttribute('look-at', '[gps-camera]');
  etiqueta.setAttribute('position', '0 2 0');
  etiqueta.setAttribute('scale', '30 30 30');
  etiqueta.setAttribute('color', '#FFFFFF');
  etiqueta.setAttribute('gps-entity-place', `latitude: ${punto.lat}; longitude: ${punto.lon}`);

  scene.appendChild(modelo);
  scene.appendChild(etiqueta);

  punto.etiqueta = etiqueta;
  punto.modelo = modelo;
}

function actualizarDistancias() {
  puntos.forEach(p => {
    const d = haversineDistance(userCoords.lat, userCoords.lon, p.lat, p.lon);
    if (p.etiqueta) {
      p.etiqueta.setAttribute('value', `${p.nombre[idioma]}\n${d} m`);
      p.etiqueta.setAttribute('color', d < 20 ? '#00FF00' : '#FF4444');
    }
  });
  actualizarRadar();
}

function mostrarTodos() {
  document.querySelector('#status').innerText = lang[idioma]['mostrando'];
  puntos.forEach(crearEntidad);
}

function centrarUsuario() {
  alert(`${lang[idioma]['tus_coordenadas']}:\nLat: ${userCoords.lat}\nLon: ${userCoords.lon}`);
}

function cambiarIdioma() {
  idioma = idioma === 'es' ? 'en' : 'es';
  document.querySelector('#status').innerText = lang[idioma]['idioma_cambiado'];
  actualizarDistancias();
  actualizarUI();
}

function actualizarRadar() {
  const radar = document.querySelector('#minimapa');
  radar.querySelectorAll('.punto-radar').forEach(el => el.remove());

  puntos.forEach(p => {
    const dx = (p.lon - userCoords.lon) * 111320 * Math.cos(userCoords.lat * Math.PI / 180);
    const dz = (p.lat - userCoords.lat) * 110540;
    const distancia = Math.sqrt(dx * dx + dz * dz);

    const maxRango = 100;
    if (distancia <= maxRango) {
      const escala = 75 / maxRango;
      const x = dx * escala;
      const y = -dz * escala;

      const punto = document.createElement('div');
      punto.className = 'punto-radar';
      punto.style.left = `${75 + x}px`;
      punto.style.top = `${75 + y}px`;
      radar.appendChild(punto);
    }
  });
}

function actualizarUI() {
  document.querySelector('#hud strong').innerText = lang[idioma]['titulo'];
  document.querySelector('#btn-mostrar').innerText = lang[idioma]['mostrar_puntos'];
  document.querySelector('#btn-centrar').innerText = lang[idioma]['centrar'];
  document.querySelector('#btn-idioma').innerText = lang[idioma]['idioma'];
}

// ✅ Cámara con video como fondo
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  .then(stream => {
    console.log('✅ Cámara activada correctamente');
    const video = document.getElementById('video-fondo');
    if ('srcObject' in video) {
      video.srcObject = stream;
    } else {
      video.src = window.URL.createObjectURL(stream);
    }
    video.onloadeddata = () => {
      video.play();
      const plano = document.createElement('a-entity');
      plano.setAttribute('geometry', 'primitive: plane; height: 100; width: 100');
      plano.setAttribute('material', 'shader: flat; src: #video-fondo; side: double;');
      plano.setAttribute('position', '0 0 -50');
      plano.setAttribute('rotation', '0 0 0');
      document.querySelector('a-scene').appendChild(plano);
      console.log('🎥 Plano de video añadido a la escena');
    };
  })
  .catch(err => console.error('❌ Error al activar cámara:', err));

// ✅ Forzar permisos de geolocalización en iOS
if (typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function') {
  window.addEventListener('click', () => {
    DeviceOrientationEvent.requestPermission().catch(() => {}).then(() => {});
    navigator.geolocation.getCurrentPosition(() => {}, () => {});
  }, { once: true });
}

window.onload = async () => {
  try {
    const resLang = await fetch('i18n/lang.json');
    lang = await resLang.json();
    actualizarUI();
    document.querySelector('#status').innerText = lang[idioma]['buscando'];
  } catch (e) {
    console.warn('No se pudo cargar lang.json', e);
  }

  try {
    const res = await fetch('data/puntos.json');
    puntos = await res.json();
  } catch (e) {
    console.error('No se pudo cargar puntos.json', e);
  }

  navigator.geolocation.watchPosition((pos) => {
    userCoords.lat = pos.coords.latitude;
    userCoords.lon = pos.coords.longitude;
    document.querySelector('#status').innerText = `Lat: ${userCoords.lat.toFixed(5)}, Lon: ${userCoords.lon.toFixed(5)}`;
    const btnRetry = document.getElementById('btn-reintentar');
    if (btnRetry) btnRetry.style.display = 'none';
    actualizarDistancias();
  }, (err) => {
    console.warn('No se pudo obtener ubicación:', err);
    let mensaje = '';
    switch (err.code) {
      case 1: mensaje = lang[idioma]['ubicacion_error_permiso']; break;
      case 2: mensaje = lang[idioma]['ubicacion_error_fuente']; break;
      case 3: mensaje = lang[idioma]['ubicacion_error_timeout']; break;
      default: mensaje = lang[idioma]['ubicacion_error'];
    }
    document.querySelector('#status').innerText = mensaje;
    const btnRetry = document.getElementById('btn-reintentar');
    if (btnRetry) btnRetry.style.display = 'block';
  }, {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 10000
  });
};