import liff from "@line/liff";

const line_init = () => {
  // LINE関連の処理
  liff.init({
    liffId: "1656696515-Arvm4l2V",
    withLoginOnExternalBrowser: true
  })
    .then(() => {
      if (!liff.isLoggedIn()) {
        liff.login();
      }
    })
    .catch(err => {
      console.log(err.message);
    });
  
  liff.ready.then(() => {
    console.log(liff.getLanguage());
    console.log(liff.getVersion());
    console.log(liff.isInClient());
    console.log(liff.isLoggedIn());
    console.log(liff.getOS());
    console.log(liff.getLineVersion());
    return liff.getProfile();
  })
    .then(profile => {
      this.profile = profile;
      console.log(this.profile);
    })
    .catch(err => {
      console.log(err.message);
    });  
}

export { line_init };