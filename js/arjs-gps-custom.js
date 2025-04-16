// arjs-gps-custom.js
// Versión personalizada de AR.js SOLO para GPS tracking
// Incluye únicamente gps-camera y gps-entity-place

AFRAME.registerComponent('gps-camera', {
  schema: {},
  init: function () {
    this.watchID = null;
    this.position = { latitude: 0, longitude: 0 };
    this._updatePosition = this._updatePosition.bind(this);
    this._handleError = this._handleError.bind(this);

    if (!navigator.geolocation) {
      console.warn('📡 Geolocation API no disponible');
      return;
    }

    // Watch GPS
    this.watchID = navigator.geolocation.watchPosition(
      this._updatePosition,
      this._handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000
      }
    );
  },

  _updatePosition: function (pos) {
    const { latitude, longitude } = pos.coords;
    this.position = { latitude, longitude };
    this.el.setAttribute('gps-camera-position', {
      latitude,
      longitude
    });
    this.el.emit('gps-camera-update-position', this.position);
  },

  _handleError: function (err) {
    console.warn('⚠️ Geolocation error:', err);
    this.el.emit('gps-camera-error', err);
  },

  remove: function () {
    if (this.watchID) {
      navigator.geolocation.clearWatch(this.watchID);
    }
  }
});

AFRAME.registerComponent('gps-entity-place', {
  schema: {
    latitude: { type: 'number' },
    longitude: { type: 'number' }
  },

  init: function () {
    this.camera = document.querySelector('[gps-camera]');
    if (!this.camera) {
      console.error('📍 No se encontró <a-camera gps-camera>');
      return;
    }

    this.updatePosition = this.updatePosition.bind(this);
    this.camera.addEventListener('gps-camera-update-position', this.updatePosition);
  },

  updatePosition: function (e) {
    const cam = e.detail;
    const place = this.data;
    const lat = cam.latitude;
    const lon = cam.longitude;

    const dx = (place.longitude - lon) * 111320 * Math.cos(lat * Math.PI / 180);
    const dz = (place.latitude - lat) * 110540;

    this.el.setAttribute('position', { x: dx, y: 0, z: -dz });
  }
});
