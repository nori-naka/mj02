<template>
  <div class="map_layout">
    <div class="overlay" v-show="show_dialog">
      <div id="dialog">
        <p class="dialog_p">モバイル情報板を開始します</p>
        <button class="dialog_btn" @click="close_dialog">OK</button>
      </div>
    </div>

    <div id="map" />
    <audio ref="audio_el" :src="audio_url"></audio>
  </div>
</template>

<script>
import "leaflet/dist/leaflet.css"
import L from "leaflet";
import pointInPolygon from "point-in-polygon";

import { wakeupLock } from "./wakeupLock";
import { get_events, areas } from "./jyohouban";
import { line_init, line_sendMsg } from "./LINE";
import hw_json from "../assets/N06-20_HighwaySection.json";

export default {
  data() {
    return {
      first_flag: true,
      map: null,
      coords: { lat: "", lng: "", time_stamp: 0 },
      last_coords: { lat: "", lng: "", time_stamp: 0 },
      profile: {},
      self_marker: null,
      clearId: {},
      regist_area_layers: {},
      audio_url: require("../assets/2s.mp3"),
      show_dialog: true
    }
  },
  async mounted() {
    // 眠気覚まし
    wakeupLock();

    await line_init(p => {
      this.profile = p;
      console.log("----------PROFILE-----------")
      console.log(this.profile);
      if (this.self_marker && this.profile.pictureUrl) {
        this.self_marker.setIcon(L.icon({
          className: "icon_style",
          iconUrl: this.profile.pictureUrl,
          iconSize: [64, 64],
          iconAnchor: [20, 20],
          popupAnchor: [0, -20]
        }))
      }
    });
    this.init_map();
  },

  //   // const hw_type = {
  //   //   1:"高速自動車国道",
  //   //   2:"高速自動車国道に並行する自動車専用道路",
  //   //   3:"一般国道の自動車専用道路",
  //   //   4:"本州四国連絡高速道路",
  //   //   5:"指定都市高速道路",
  //   //   6:"その他の道路"
  //   // }

  methods: {
    close_dialog() {
      this.show_dialog = false;
      this.$refs.audio_el.play();
      console.log("はい！");
    },
    // モバイル情報板用
    is_area_in(areas) {
      console.log(areas);
      if (this.coords.lat == "" || this.coords.lng == "") return;

      Object.keys(areas).forEach( async id => {
        if (areas[id] && areas[id].coords && areas[id].content) {
          const area_in = pointInPolygon([this.coords.lat, this.coords.lng], areas[id].coords);
          if (area_in) {
            console.log("エリアの中にいます。");
            console.log(areas[id]);

            if (areas[id].last_content != areas[id].content && !areas[id].played) {
              this.audio_url = `${areas[id].content}`;
              await this.$refs.audio_el.play();
              areas[id].last_content = areas[id].content;
              areas[id].played = Date.now();
            }
          } else {
            console.log("残念。外です。");
            if (areas[id].played && Date.now() - areas[id].played > 30000) {
              areas[id].played = false;
            }
          }
        }
      });
    },
    // 避難所用
    checkedIn() {
      if (this.coords.lat == "" || this.coords.lng == "") return;

      Object.keys(this.regist_area_layers).forEach( async id => {
        if (this.regist_area_layers[id].layer) {
          const [ latlngs ] = this.regist_area_layers[id].layer.getLatLngs();
          const arr_points = latlngs.map(latlng => { return [latlng.lat, latlng.lng] });
          const area_in = pointInPolygon([this.coords.lat, this.coords.lng], arr_points);
          if (area_in) {
            console.log("エリアの中にいます。");
            console.log(this.last_msg_id);
            console.log(this.regist_area_layers);
            console.log(this.regist_area_layers[id].msg_id);

            // await fetch(TEST_URL);
            if (this.last_msg_id != this.regist_area_layers[id].msg_id) {
              line_sendMsg(id);
              this.last_msg_id = this.regist_area_layers[id].msg_id;
            }
          } else {
            console.log("残念。外です。");
          }
        }
      })
    },
    // async regist_area() {
    //   const res = await fetch(GEO_URL);
    //   const geo_json = await res.json();
    //   const regist_ids = Object.keys(this.regist_area_layers);

    //   L.geoJSON(geo_json, {
    //     // filter: feature => {
    //     //   feature.properties.id
    //     // },
    //     onEachFeature: (feature, layer) => {
    //       const new_id = feature.properties.id;

    //       // 既に登録済みのエリアの場合
    //       if (regist_ids.includes(new_id)) {
    //         // messageを更新
    //         if (this.regist_area_layers[new_id].layer) {
    //           this.regist_area_layers[new_id].layer.getPopup().setContent(feature.properties.message);
    //           regist_ids.splice(regist_ids.indexOf(new_id), 1);
    //         }
    //       // 登録が無い場合
    //       } else {
    //         this.regist_area_layers[new_id] = {
    //           layer: layer,
    //           msg_id: feature.properties.msg_id
    //         };
    //         layer.bindPopup(feature.properties.message);
    //         this.map.addLayer(layer);
    //       }
    //     },
    //     style: () => {
    //       return {
    //         color: "red",
    //         opacity: 0.1
    //       };
    //     }
    //   });

    //   regist_ids.forEach(id => {
    //     this.map.removeLayer(this.regist_area_layers[id].layer);
    //     delete this.regist_area_layers[id];
    //   });
    // },
    init_map() {
      navigator.geolocation.watchPosition(this.geo_success, this.geo_error);

      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution: '© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
        opacity: 0.5
      });
      const kokudoLayer = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg',{
        attribution: '© <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
        opacity: 0.5
      });
      const baseMap = {
        "OpenStreetMap": osmLayer,
        "航空写真": kokudoLayer,
      };

      const hw_layer = L.geoJSON(hw_json, {
        style: () => {
          // console.dir(feature);
          return { 
            color: "gray",
            weight: 3
          }
        },
        // onEachFeature: (feature, layer) => {
        //   console.log(feature);
        //   console.log(layer);
        //   layer.bindPopup(
        //     `<h1>${feature.properties.N06_007}</h1>
        //     <h3>${hw_type[feature.properties.N06_008]} / ${feature.properties.N06_010}車線</h3>`
        //   );
        // }
      });
      const overLayer = {
        "高速道路": hw_layer,
      }
      this.map = L.map("map", {
        center: L.latLng( 35.6825, 139.752778), 
        zoom: 15
      }).addLayer(osmLayer);
      L.control.layers(baseMap, overLayer, {
        position: "bottomright"
      }).addTo(this.map);

      this.is_area_in(areas);
      this.clearId["is_area_in"] = setInterval(() => {this.is_area_in(areas)}, 1000);

      // this.regist_area();
      // this.clearId["regist_area"] = setInterval(this.regist_area, 1000);

      // this.checkedIn();
      // this.clearId["checkedIn"] = setInterval(this.checkedIn, 1000);
    },
    async geo_success(pos) {
      this.coords = {
        lat: Math.round(pos.coords.latitude * 1000000) / 1000000,
        lng: Math.round(pos.coords.longitude * 1000000) / 1000000,
        time_stamp: Date.now()
      }
      const latlng = L.latLng(this.coords);
      // const popup_content = `<h1>現在の場所は、<br>緯度 ${latlng.lat}<br>経度 ${latlng.lng}</h1>`

      // 初めてgeo_successが実行されるときのみ、実行される
      if (this.first_flag) {
        this.map.panTo(latlng, {animate: true});

        // if (this.self_marker && this.profile.pictureUrl) {
        //   this.self_marker.setIcon(L.icon({
        //     className: "icon_style",
        //     iconUrl: this.profile.pictureUrl,
        //     iconSize: [40, 40],
        //     iconAnchor: [20, 20],
        //     popupAnchor: [0, -20]
        //   }));
        // }
        this.first_flag = false;
      }

      if (this.self_marker) {
        this.self_marker.setLatLng(latlng);
      } else {
        // アイコンを使用する場合
        this.self_marker = L.marker(latlng, {
          icon: L.icon({
            className: "icon_style",
            iconUrl: this.profile.pictureUrl ? this.profile.pictureUrl : require("@/assets/people_marker.png"),
            iconSize: [64, 64],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
          })
        })
          .addTo(this.map)
          // .bindPopup(popup_content);
      }
      // モバ情の場合
      console.log(`NOW:${this.coords.time_stamp} LAST:${this.last_coords.time_stamp}`);
      if (this.coords.time_stamp - this.last_coords.time_stamp > 1000) {
        await get_events({lat: this.coords.lat, lon: this.coords.lng, range: 300}, this.map);
      }
      this.last_coords = { ...this.coords };
    },
    geo_error(error) {
      console.log(`GEO_ERROR: ${error.message}`);
    }
  },
  beforeDestroy() {
    Object.keys(this.clearId).forEach(id => {
      clearInterval(this.clearId[id]);
    })
  }
}
</script>

<style>
.icon_style {
  border-radius: 50%;
  border-color: #549fa9;
  border-width: 1px;
}
.map_layout {
  position: relative;
  height: 100vh;
  /* display: flex;
  flex-direction: column; */
}
#map {
  z-index: 1;
  height: 100%;
  width: 100%;
}
#button {
  user-select: none; /* Chrome, Safari, and Opera */
  -webkit-touch-callout: none; /* Disable Android and iOS callouts*/
  z-index: 10;
  position: absolute;
  bottom: 20px;
  left: calc(50% - 36px);
  display: inline-block;
  text-decoration: none;
  background: #5dc3d0;
  color: rgb(82, 142, 150);
  width: 73px;
  font-size: 16px;
  height: 72px;
  line-height: 72px;
  border-radius: 50%;
  text-align: center;
  overflow: hidden;
  box-shadow: inset 0px 3px 0 rgba(255,255,255,0.3), 0 3px 3px rgba(0, 0, 0, 0.3);
  font-weight: bold;
  border-bottom: solid 3px #549fa9;
  text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.65);
  transition: .4s;
}
#button:active {
  -webkit-transform: translateY(1px);
  transform: translateY(1px);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.35);
  border-bottom: none;
}
.overlay{
  z-index: 20;
  display: block;
  width: 100%;
  height: 100%;
  position: absolute;
  background-color: rgba(0,0,0,0.5);
  top: 0;
  left: 0;
  /* 画面の中央に要素を表示させる設定 */
  display: flex;
  align-items: center;
  justify-content: center;
}

#dialog{
  z-index:21;
  width:50%;
  padding: 1em;
  background:#eee;
}
.dialog_p {
  font-size: 1.6rem;
}
.dialog_btn {
  color: #fff;
  background-color: #eb6100;
  border-radius: 100vh;
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1.5;
  position: relative;
  display: inline-block;
  padding: 0.2rem 4rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s;
  text-align: center;
  vertical-align: middle;
  text-decoration: none;
  letter-spacing: 0.1em;
  border: 0px;
}
.dialog_btn:hover {
  color: #fff;
  background: #f56500;
}
</style>
