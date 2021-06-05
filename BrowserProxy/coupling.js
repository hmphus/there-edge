if (window.VoiceTrainer != undefined) {
  VoiceTrainer.style.display = 'none';
  VoiceTrainer.configState = 0;
  VoiceTrainer.recordLevel = 0;
  VoiceTrainer.configMessage = null;
  VoiceTrainer.configError = null;
  VoiceTrainer.events = {};

  VoiceTrainer.attachEvent = function(name, callback) {
    VoiceTrainer.events[name] = callback;
  };

  VoiceTrainer.Init = function() {
    window.chrome.webview.addEventListener('message', function(message) {
      if (message.data.name == 'VoiceTrainer') {
        if (message.data.data != undefined) {
          Object.assign(VoiceTrainer, message.data.data);
        }
        const event = VoiceTrainer.events[message.data.event];
        if (event != undefined) {
          event();
        }
      }
    });
    window.chrome.webview.postMessage(`voiceTrainer/init`);
  };

  VoiceTrainer.Config = function(state) {
    window.chrome.webview.postMessage(`voiceTrainer/put?configState=${state}`);
  };

  VoiceTrainer.launchRecordingMixer  = function(state) {
    window.chrome.webview.postMessage(`voiceTrainer/launchRecordingMixer`);
  };

  const initialize = function() {
      VoiceTrainer.attachEvent('onconfigstatechange', VoiceTrainer_onconfigstatechange);
      VoiceTrainer.attachEvent('onbeginrecord', VoiceTrainer_onbeginrecord);
      VoiceTrainer.attachEvent('onendrecord', VoiceTrainer_onendrecord);
      VoiceTrainer.attachEvent('onlevelchange', VoiceTrainer_onlevelchange);
      VoiceTrainer.attachEvent('onconfigerror', VoiceTrainer_onconfigerror);
      VoiceTrainer.Init();
  };

  if (document.readyState == 'complete') {
    initialize();
  } else {
    document.addEventListener('readystatechange', function(event) {
      initialize();
    });
  }
}

window.ActiveXObject = function(name) {
  this.name = name;
};

ActiveXObject.prototype.load = function(url) {
  const self = this;
  const request = new XMLHttpRequest();
  request.addEventListener('load', function() {
    self.readyState = 4;
    if (self.onreadystatechange != undefined) {
      self.onreadystatechange(this.responseXML);
    }
  });
  request.open('GET', url);
  request.send();
};

console.log('There Edge compatibility coupling installed');