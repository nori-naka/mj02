<template>
  <div class="map_layout">
    <div v-if="false" class="overlay"></div>
    <div id="map" />
    <!-- <div id="button" @click="speech">PUSH</div> -->
    <audio ref="sound_el"></audio>
  </div>
</template>

<script>
import "leaflet/dist/leaflet.css"
import L from "leaflet";
import { wakeupLock } from "./wakeupLock";
import { get_events } from "./jyohouban";
import { line_init } from "./LINE";

export default {
  data() {
    return {
      first_flag: true,
      map: null,
      coords: {
        lat: "",
        lng: ""
      },
      profile: {},
      self_marker: null,
    }
  },
  async mounted() {

    wakeupLock();
    // line_init();

    navigator.geolocation.watchPosition(this.geo_success, this.geo_error);
    this.map = L.map("map", {
      center: L.latLng( 35.6825, 139.752778), 
      zoom: 12
    }).addLayer(
      L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png')
    );

    // 1秒おきに、サーバ側で、フラグが立ったか？を確認している。
    // setInterval(async () => {
    //   await this.get_flag();
    // }, 1000);
  },
  methods: {
    sound_on(url) {
      this.$refs.sound_el.src = url;
      this.$refs.sound_el.play();
    },
    // 住所（文字列）をMessageAPIで送信して、その後、喋る
    // async speech() {
    //   // const uttr = new SpeechSynthesisUtterance(this.talk);
    //   // uttr.lang = "ja-JP";
    //   // speechSynthesis.speak(uttr);

    //   try {
    //     await this.get_talk();
    //     console.log(this.talk);
    //     await liff.sendMessages([
    //       { 
    //         type: "text",
    //         text: this.talk,
    //       }
    //     ])
    //     console.log("sendMessage");
    //   } catch (err) {()=> console.log(err.message);}

    //   this.sound_on(this.audio_src);
    //   this.self_marker.openPopup();
    // },
    async geo_success(pos) {
      this.coords = {
        lat: Math.round(pos.coords.latitude * 1000000) / 1000000,
        lng: Math.round(pos.coords.longitude * 1000000) / 1000000
      }
      const latlng = L.latLng(this.coords);

      // 初めてgeo_successが実行されるときのみ、実行される
      if (this.first_flag) {
        this.map.panTo(latlng, {animate: true});
        line_init(p => {
          this.profile = p;
          console.log("----------PROFILE-----------")
          console.log(this.profile);
        });
        this.first_flag = false;
      }
      const popup_content = `<h1>現在の場所は、<br>緯度 ${latlng.lat}<br>経度 ${latlng.lng}</h1>`
      if (this.self_marker) {
        this.map.removeLayer(this.self_marker);
      }

      // アイコンを使用する場合
      this.self_marker = L.marker(latlng, {
        icon: L.icon({
          iconUrl: this.profile.pictureUrl ? require(this.profile.pictureUrl) : require("@/assets/people_marker.png"),
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -20]
        })
      })
        .addTo(this.map)
        .bindPopup(popup_content);

      await get_events({lat: this.coords.lat, lon: this.coords.lng, range: 300}, this.map);
    },
    geo_error(error) {
      console.log(`GEO_ERROR: ${error.message}`);
    }
  }
}
</script>

<style>
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
  background-color: #000;
  opacity: 0.7;
  top: 0;
  left: 0;
}

</style>