const axios = require('axios');

async function executeMCPGeo(task) {
  if (process.env.DEMO_MODE === 'true' || !process.env.DEMO_MODE) {
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 700) + 150));
    return { mocked: true, node: 'geo', action: task.action, payload: task.payload };
  }

  if (task.action === 'get_eta') {
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!mapsKey) throw new Error('GOOGLE_MAPS_API_KEY is not set in .env');

    try {
      // Mock origin roughly from user's usual location setup (Bangalore)
      const origin = 'HSR Layout, Bangalore';
      const destination = task.payload.location || 'Koramangala, Bangalore';
      
      const geocode = await axios.get(`https://maps.googleapis.com/maps/api/directions/json`, {
        params: { origin, destination, key: mapsKey }
      });
      
      if (geocode.data.status !== 'OK') throw new Error(`Maps API Error: ${geocode.data.status}`);
      
      const leg = geocode.data.routes[0].legs[0];
      return { 
        mocked: false, 
        node: 'geo', 
        action: 'get_eta', 
        eta_minutes: leg.duration.text,
        distance: leg.distance.text,
        traffic: 'calculating...'
      };
    } catch (err) {
      throw new Error(`Google Maps API failed: ${err.message}`);
    }
  }

  throw new Error(`Action ${task.action} not supported by Geo Worker`);
}
module.exports = { executeMCPGeo };