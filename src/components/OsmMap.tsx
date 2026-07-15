import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { getDirections } from '../services/api';

export interface LatLng {
  lat: number;
  lng: number;
}

interface OsmMapProps {
  /** Where the driver currently is — drawn as the moving car marker. */
  driver?: LatLng | null;
  /** Customer pickup point — drawn as a blue dot. */
  pickup?: LatLng | null;
  /** Final dropoff — drawn as a green dot. Pass once the ride is in progress. */
  dropoff?: LatLng | null;
  /** Where the polyline routes to. 'pickup' before OTP, 'dropoff' after. */
  routeTarget?: 'pickup' | 'dropoff';
  style?: ViewStyle;
  fallbackCenter?: LatLng;
  /** Reports the live driving distance + ETA to the current target (pickup
   *  before OTP, dropoff after) each time the route is (re)computed. */
  onRouteInfo?: (info: RouteInfo) => void;
}

const DEFAULT_CENTER: LatLng = { lat: 28.4595, lng: 77.0266 };
const OSRM = 'https://router.project-osrm.org/route/v1/driving';

// Same Google Maps key the customer app + backend use (backend .env
// GOOGLE_MAPS_API_KEY). Rendered inside the WebView via the Maps JavaScript
// API. The key is used server-side too, so it isn't Android-app-restricted —
// which is why it works from a WebView. The OSRM call above still supplies the
// route polyline (free); Google only provides the base map + markers.
// NOTE: requires "Maps JavaScript API" to be enabled for this key's project.
const MAPS_API_KEY = 'AIzaSyCk60GS7y9zBmn5DzYjz6_LigHH9FWgO28';

export interface RouteInfo {
  /** Driving distance to the current target, in kilometres. */
  distanceKm: number;
  /** Estimated driving time to the current target, in minutes. */
  durationMin: number;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchRoute(
  from: LatLng,
  to: LatLng,
): Promise<{ coords: LatLng[]; info: RouteInfo }> {
  // 1) Backend /geo/directions first (Google Directions → OSRM server-side).
  // The public OSRM demo server below is rate-limited and flaky when called
  // straight from a handset — it was the main reason drivers saw no route /
  // no ETA. The backend route is authenticated, keyed, and shared with the
  // customer app so both sides quote the same road distance.
  try {
    const d = await getDirections(from, to);
    if (d && Array.isArray(d.polyline) && d.polyline.length >= 2) {
      return {
        coords: d.polyline.map(p => ({ lat: p.lat, lng: p.lng })),
        info: {
          distanceKm: d.distanceMeters / 1000,
          durationMin: d.durationSeconds / 60,
        },
      };
    }
  } catch (e) {
    console.warn('[map] backend directions failed:', e);
  }

  // 2) Direct public-OSRM fallback (works even if our backend is down).
  try {
    const url = `${OSRM}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const r = data?.routes?.[0];
    const coords = r?.geometry?.coordinates;
    if (Array.isArray(coords)) {
      // OSRM returns distance in metres and duration in seconds for the
      // actual road route — that's the "real" distance/ETA we surface.
      return {
        coords: coords.map((c: [number, number]) => ({ lat: c[1], lng: c[0] })),
        info: {
          distanceKm:
            typeof r.distance === 'number' ? r.distance / 1000 : haversineKm(from, to),
          durationMin:
            typeof r.duration === 'number' ? r.duration / 60 : haversineKm(from, to) * 2.5,
        },
      };
    }
  } catch (e) {
    console.warn('[map] route failed:', e);
  }
  // 3) Straight-line fallback so the driver still sees something useful when
  // both routers are unreachable (low-signal areas, OSRM rate-limit, etc).
  // Distance is great-circle; time is a rough ~24 km/h city estimate (2.5 min/km).
  const d = haversineKm(from, to);
  return { coords: [from, to], info: { distanceKm: d, durationMin: d * 2.5 } };
}

function buildHtml(
  center: LatLng,
  driver: LatLng | null,
  pickup: LatLng | null,
  dropoff: LatLng | null,
  route: LatLng[],
): string {
  const markers: Array<{ lat: number; lng: number; type: 'pickup' | 'dropoff' | 'driver' }> = [];
  if (pickup) markers.push({ lat: pickup.lat, lng: pickup.lng, type: 'pickup' });
  if (dropoff) markers.push({ lat: dropoff.lat, lng: dropoff.lng, type: 'dropoff' });
  if (driver) markers.push({ lat: driver.lat, lng: driver.lng, type: 'driver' });
  const routeCoords = route.map(c => ({ lat: c.lat, lng: c.lng }));

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<style>html,body,#map{height:100%;margin:0;padding:0;background:#e8eef5}</style>
</head><body>
<div id="map"></div>
<script>
function initMap(){
  var map = new google.maps.Map(document.getElementById('map'),{
    center: {lat:${center.lat},lng:${center.lng}},
    zoom: 16,
    disableDefaultUI: true,
    gestureHandling: 'greedy',
    clickableIcons: false,
  });
  var bounds = new google.maps.LatLngBounds();
  var markers = ${JSON.stringify(markers)};
  markers.forEach(function(m){
    var pos = {lat:m.lat,lng:m.lng};
    if(m.type==='driver'){
      new google.maps.Marker({position:pos,map:map,zIndex:999,
        label:{text:'🚗',fontSize:'20px'},
        icon:{path:google.maps.SymbolPath.CIRCLE,scale:15,fillColor:'#ffffff',fillOpacity:1,strokeColor:'#0097B3',strokeWeight:2}});
    } else {
      var color = m.type==='pickup' ? '#3B5BDB' : '#16A34A';
      new google.maps.Marker({position:pos,map:map,
        icon:{path:google.maps.SymbolPath.CIRCLE,scale:7,fillColor:color,fillOpacity:1,strokeColor:'#ffffff',strokeWeight:2}});
    }
    bounds.extend(pos);
  });
  var route = ${JSON.stringify(routeCoords)};
  if(route.length>=2){
    new google.maps.Polyline({path:route,map:map,geodesic:true,
      strokeColor:'#0097B3',strokeOpacity:0.95,strokeWeight:6});
    route.forEach(function(p){bounds.extend(p);});
  }
  if(markers.length + route.length >= 2 && !bounds.isEmpty()){
    map.fitBounds(bounds,{top:60,right:60,bottom:60,left:60});
    google.maps.event.addListenerOnce(map,'idle',function(){
      if(map.getZoom() > 17) map.setZoom(17);
    });
  }
}
</script>
<script async src="https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&callback=initMap"></script>
</body></html>`;
}

export const OsmMap: React.FC<OsmMapProps> = ({
  driver,
  pickup,
  dropoff,
  routeTarget = 'pickup',
  style,
  fallbackCenter = DEFAULT_CENTER,
  onRouteInfo,
}) => {
  const [route, setRoute] = useState<LatLng[]>([]);
  const [loading, setLoading] = useState(false);
  // Origin+target of the last successful route fetch. Screens feed us GPS
  // ticks every ~10 m (watchPosition distanceFilter), and each route fetch can
  // now hit the backend's Google Directions — so don't re-route on every tick.
  // The car marker still moves every tick (html rebuild below); only the
  // polyline/ETA refresh is throttled.
  const lastFetchRef = React.useRef<{ from: LatLng; to: LatLng } | null>(null);
  const REROUTE_MIN_KM = 0.15; // refetch once the driver drifts >150 m off the last route origin

  // The route's destination is whichever leg the driver is on. Recompute
  // whenever the driver's location moves meaningfully or the target flips
  // from pickup→dropoff after OTP verification.
  const target = routeTarget === 'dropoff' ? dropoff : pickup;
  const targetKey = target ? `${target.lat},${target.lng}` : '';
  const driverKey = driver ? `${driver.lat},${driver.lng}` : '';

  useEffect(() => {
    let cancelled = false;
    if (!driver || !target) {
      setRoute([]);
      lastFetchRef.current = null;
      return () => {
        cancelled = true;
      };
    }
    const last = lastFetchRef.current;
    const sameTarget =
      last && last.to.lat === target.lat && last.to.lng === target.lng;
    if (sameTarget && haversineKm(last.from, driver) < REROUTE_MIN_KM) {
      // Driver hasn't moved far enough to justify a re-route.
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    (async () => {
      const r = await fetchRoute(driver, target);
      if (!cancelled) {
        lastFetchRef.current = { from: driver, to: target };
        setRoute(r.coords);
        setLoading(false);
        onRouteInfo?.(r.info);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driverKey, targetKey]);

  const html = useMemo(() => {
    const center = driver || pickup || dropoff || fallbackCenter;
    return buildHtml(center, driver || null, pickup || null, dropoff || null, route);
  }, [
    driverKey,
    pickup?.lat,
    pickup?.lng,
    dropoff?.lat,
    dropoff?.lng,
    route,
    fallbackCenter.lat,
    fallbackCenter.lng,
  ]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
      />
      {loading && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color="#0097B3" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8eef5',
    overflow: 'hidden',
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: 8,
  },
});
