// app.js - Cámara natural con video HTML, radar optimizado y entidades GPS

let userCoords = { lat: 0, lon: 0 };
let idioma = 'es';
let puntos = [];
let lang = {};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function crearEntidad(punto) {
  const scene = document.querySelector('a-scene');

  const contenedor = document.createElement('a-entity');
  contenedor.setAttribute('gps-entity-place', `latitude: ${punto.lat}; longitude: ${punto.lon}`);

  const modelo = document.createElement('a-entity');
  modelo.setAttribute('gltf-model', punto.modelo);
  modelo.setAttribute('scale', '1 1 1');
  modelo.setAttribute('rotation', '0 180 0');
  modelo.setAttribute('animation-mixer', '');

  modelo.addEventListener('model-error', () => {
    const advertencia = document.createElement('a-text');
    advertencia.setAttribute('value', '⚠️ Modelo no cargado');
    advertencia.setAttribute('position', '0 1 0');
    advertencia.setAttribute('scale', '20 20 20');
    advertencia.setAttribute('color', 'red');
    contenedor.appendChild(advertencia);
  });

  const etiqueta = document.createElement('a-text');
  etiqueta.setAttribute('value', `${punto.nombre[idioma]}\nCalculando...`);
  etiqueta.setAttribute('look-at', '[gps-camera]');
  etiqueta.setAttribute('position', '0 2 0');
  etiqueta.setAttribute('scale', '30 30 30');
  etiqueta.setAttribute('color', '#FFFFFF');

  contenedor.appendChild(modelo);
  contenedor.appendChild(etiqueta);
  scene.appendChild(contenedor);

  punto.etiqueta = etiqueta;
  punto.modelo = modelo;
  punto.contenedor = contenedor;
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
  const escala = 75 / 100;
  const maxRango = 100;

  const existentes = {};
  radar.querySelectorAll('.punto-radar').forEach(el => {
    existentes[el.dataset.id] = el;
  });

  puntos.forEach((p, i) => {
    const dx = (p.lon - userCoords.lon) * 111320 * Math.cos(userCoords.lat * Math.PI / 180);
    const dz = (p.lat - userCoords.lat) * 110540;
    const distancia = Math.sqrt(dx * dx + dz * dz);

    const id = `punto-${i}`;
    let punto = existentes[id];

    if (distancia <= maxRango) {
      const x = dx * escala;
      const y = -dz * escala;

      if (!punto) {
        punto = document.createElement('div');
        punto.className = 'punto-radar';
        punto.dataset.id = id;
        radar.appendChild(punto);
      }

      punto.style.left = `${75 + x}px`;
      punto.style.top = `${75 + y}px`;
    } else if (punto) {
      punto.remove();
    }
  });
}

function actualizarUI() {
  document.querySelector('#hud strong').innerText = lang[idioma]['titulo'];
  document.querySelector('#btn-mostrar span').innerText = lang[idioma]['mostrar_puntos'];
  document.querySelector('#btn-centrar span').innerText = lang[idioma]['centrar'];
  document.querySelector('#btn-idioma span').innerText = lang[idioma]['idioma'];
}

navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  .then(stream => {
    console.log('✅ Cámara activada correctamente');
    const video = document.getElementById('video-fondo');
    if ('srcObject' in video) video.srcObject = stream;
    else video.src = window.URL.createObjectURL(stream);
    video.onloadeddata = () => video.play();
  })
  .catch(err => console.error('❌ Error al activar cámara:', err));

window.onload = async () => {
  try {
    const resLang = await fetch('i18n/lang.json');
    lang = await resLang.json();
  } catch (e) {
    console.warn('No se pudo cargar lang.json', e);
    lang = {
      es: {
        titulo: "GPS WebAR",
        buscando: "Buscando ubicación...",
        mostrar_puntos: "Ver puntos",
        centrar: "Centrar",
        idioma: "Idioma",
        mostrando: "Mostrando puntos",
        idioma_cambiado: "Idioma cambiado",
        ubicacion_error: "Ubicación no disponible",
        ubicacion_error_permiso: "Permiso denegado",
        ubicacion_error_fuente: "Error de origen",
        ubicacion_error_timeout: "Tiempo agotado",
        tus_coordenadas: "Coordenadas"
      },
      en: {
        titulo: "GPS WebAR",
        buscando: "Locating...",
        mostrar_puntos: "Show points",
        centrar: "Center",
        idioma: "Language",
        mostrando: "Showing points",
        idioma_cambiado: "Language changed",
        ubicacion_error: "Location error",
        ubicacion_error_permiso: "Permission denied",
        ubicacion_error_fuente: "Position unavailable",
        ubicacion_error_timeout: "Timeout expired",
        tus_coordenadas: "Your coordinates"
      }
    };
  }

  actualizarUI();
  document.querySelector('#status').innerText = lang[idioma]['buscando'];

  try {
    const res = await fetch('data/puntos.json');
    puntos = await res.json();
  } catch (e) {
    console.error('No se pudo cargar puntos.json', e);
    puntos = [];
  }

  navigator.geolocation.watchPosition(
    (pos) => {
      userCoords.lat = pos.coords.latitude;
      userCoords.lon = pos.coords.longitude;
      document.querySelector('#status').innerText = `Lat: ${userCoords.lat.toFixed(5)}, Lon: ${userCoords.lon.toFixed(5)}`;
      actualizarDistancias();
    },
    (err) => {
      console.warn('No se pudo obtener ubicación:', err);
      const status = document.querySelector('#status');
      if (err.code === 1) status.innerText = lang[idioma]['ubicacion_error_permiso'];
      else if (err.code === 2) status.innerText = lang[idioma]['ubicacion_error_fuente'];
      else if (err.code === 3) status.innerText = lang[idioma]['ubicacion_error_timeout'];
      else status.innerText = lang[idioma]['ubicacion_error'];
      document.getElementById('btn-reintentar').style.display = 'inline-block';
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    }
  );
};