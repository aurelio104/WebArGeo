// arjs-gps-custom.js
// Versión personalizada de AR.js SOLO para GPS tracking
// Incluye únicamente gps-camera y gps-entity-place

AFRAME.registerComponent('gps-camera', {
    schema: {
      simulateLatitude: { type: 'number', default: 0 },
      simulateLongitude: { type: 'number', default: 0 }
    },
    init: function () {
      this.watchId = null;
      this.el.setAttribute('position', '0 0 0');
      this.system = this.el.sceneEl.systems['gps-camera'];
    },
    play: function () {
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        return;
      }
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.system.setCurrentPosition(position.coords.latitude, position.coords.longitude);
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 27000 }
      );
    },
    pause: function () {
      if (this.watchId != null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
    }
  });
  
  AFRAME.registerSystem('gps-camera', {
    init: function () {
      this.currentLatitude = 0;
      this.currentLongitude = 0;
    },
    setCurrentPosition: function (lat, lon) {
      this.currentLatitude = lat;
      this.currentLongitude = lon;
      this.el.emit('gps-camera-update-position', { latitude: lat, longitude: lon });
    },
    getCurrentPosition: function () {
      return {
        latitude: this.currentLatitude,
        longitude: this.currentLongitude
      };
    }
  });
  
  AFRAME.registerComponent('gps-entity-place', {
    schema: {
      latitude: { type: 'number' },
      longitude: { type: 'number' }
    },
    init: function () {
      this.el.sceneEl.addEventListener('gps-camera-update-position', this.updatePosition.bind(this));
    },
    updatePosition: function (event) {
      const lat1 = event.detail.latitude;
      const lon1 = event.detail.longitude;
      const lat2 = this.data.latitude;
      const lon2 = this.data.longitude;
  
      const d = this.computeOffset(lat1, lon1, lat2, lon2);
      this.el.setAttribute('position', `${d.x} 0 ${d.z}`);
    },
    computeOffset: function (lat1, lon1, lat2, lon2) {
      const R = 6378137;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const x = R * dLon * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
      const z = R * dLat;
      return { x, z };
    }
  });
  