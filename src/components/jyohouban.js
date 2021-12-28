import "leaflet/dist/leaflet.css"
import L from "leaflet";
import { GSI } from "./muni.js";


const equalObj = (obj_a, obj_b) => {
  if (obj_a === obj_b) return true;
  const key_a = Object.keys(obj_a);
  const key_b = Object.keys(obj_b);
  if (key_a.toString() !== key_b.toString()) return false;
  key_a.forEach(key => {
    if (obj_a[key] !== obj_b[key]) return false;
  });
  return true;
}

// 緯度経度から住所を調べる。
const get_address = async ({ lat, lon }) => {
  const latlng_json = {
    lat: lat,
    lon: lon
  }
  const qs = new URLSearchParams(latlng_json);
  const fetch_url = `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?${qs}`;
  const res = await fetch(fetch_url);

  if (res.ok) {
    const address_data = await res.json();
    const banchi = address_data.results.lv01Nm;
    const muniCd = address_data.results.muniCd;
    const [, ken_name, , city_name] = GSI.MUNI_ARRAY[muniCd].split(",");

    return {
      ken: ken_name,
      city: city_name,
      banchi: banchi
    }
  } else {
    return null
  }
}

const MAIN_URL = "https://mobileinfogroupappservice.azurewebsites.net"
const API_EVENTS = "/api/FixedEvents"
const API_AREA = "/api/AreaPoints"
const get_events = async ({lat, lon, range}, map) => {

  const url_event = MAIN_URL + API_EVENTS + `?lat=${lat}&lon=${lon}&range=${range}`;
  const mj = {};
  // const area_ids = [];

  const res_event = await fetch(url_event);
  if (res_event.ok) {
    const json_event = await res_event.json();

    // 一旦全部消す
    Object.keys(mj).forEach(id => {
      map.removeLayer(mj[id]);
    })

    json_event.forEach( async ({ payload }) => {
      if (
        payload && payload.nodeID && payload.node && payload.node.p2 && payload.locationTypeID &&
        payload.actions && payload.actions.length > 0 && payload.actions[0].action.voices
      ) {

        const content = `<H1>${payload.eventTitle}</H1>
        <audio controls src=${payload.actions[0].action.voices[0].url}> </audio>`

        if (payload.locationTypeID == 2) {
          // area_ids.push(payload.nodeID); 
          const url_area = MAIN_URL + API_AREA + `?id=${payload.nodeID}`;
          const res_area = await fetch(url_area);
          if (res_area.ok) {
            const json_area = await res_area.json();
            const latlngs = json_area.map(point => {
              return [point.latitude, point.longitude]
            });
            console.log(latlngs);
            mj[payload.nodeID] = L.polygon(latlngs, {color: "red"})
              .addTo(map)
              .bindPopup(content);  
          }
        } else {
          const latlng = L.latLng({lat: payload.node.p2.latitude, lng: payload.node.p2.longitude});
          mj[payload.nodeId] = L.marker(latlng, {
            icon: L.icon({
              iconUrl: require("@/assets/Icon-76.png"),
              iconSize: [40, 40],
              iconAnchor: [20, 20],
              popupAnchor: [0, -20]
            })
          })
            .addTo(map)
            .bindPopup(content);  
        }
      }
    });
  }

  // area_ids.forEach(async id => {
  //   const url_area = MAIN_URL + API_AREA + `?id=${id}`;
  //   const res_area = await fetch(url_area);
  //   if (res_area.ok) {
  //     const json_area = await res_area.json();
  //     const latlngs = json_area.map(point => {
  //       return [point.latitude, point.longitude]
  //     });
  //     console.log(latlngs);
  //   }  
  // })
}

export { get_events, equalObj, get_address };