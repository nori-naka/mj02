import liff from "@line/liff";

const line_init = (next) => {
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
    .then(() => {
      const profile = liff.getProfile();
      return profile;
    })
    .then(profile => {
      console.log(liff.getLanguage());
      console.log(liff.getVersion());
      console.log(liff.isInClient());
      console.log(liff.isLoggedIn());
      console.log(liff.getOS());
      console.log(liff.getLineVersion());
      console.log(liff.getProfile());
  
      profile.lang = liff.getLanguage();
      profile.version = liff.getVersion();
      profile.inInClient = liff.isInClient();
      profile.isLoggedIn = liff.isLoggedIn();
      profile.os = liff.getOS();
      profile.lineVersion = liff.getLineVersion();

      if (next) next(profile);

    })
    .catch(err => {
      console.log(err.message);
    });
  return liff.ready;
}

const line_close = () => {
  liff.closeWindow();
}

const line_sendMsg = msg => {
  liff.sendMessages([
    {
      type: "text", 
      text: msg
    }
  ])
  .catch(err => { console.log(err) });
}

export { line_init, line_close, line_sendMsg };