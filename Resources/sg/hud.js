class Channel {
  constructor(name) {
    let self = this;
    self.name = name;
    self.parser = new DOMParser();
  }

  get ready() {
    let self = this;
    return self.data != undefined;
  }

  set xml(text) {
    let self = this;
    if (self.name == 'event') {
      text = text.replace(/(<query>.+)&(.+<\/query>)/, '$1&amp;$2');
    }
    const xml = self.parser.parseFromString(text, 'text/xml');
    const xmlAnswer = xml.getElementsByTagName('Answer')[0];
    const xmlResult = xmlAnswer.getElementsByTagName('Result')[0];
    if (xmlResult.childNodes[0].nodeValue != 1) {
      return;
    }
    const xmlVersion = xmlAnswer.getElementsByTagName('version')[0];
    const version = xmlVersion.childNodes[0].nodeValue;
    if (version == self.version) {
      return;
    }
    const xmlData = xmlAnswer.getElementsByTagName(self.name)[0];
    if (xmlData == undefined) {
      return;
    }
    self.version = version;
    self.data = self.parse(xmlData);
    if (xmlAnswer.getElementsByTagName('parsererror')[0] != undefined) {
      console.log(`${self.name} had an error during parsing: ${text}`);
    }
    for (let listener of There.data.listeners) {
      if (listener.onData != undefined) {
        listener.onData(self.name, self.data);
      }
    }
  }

  parse(xml) {
    let self = this;
    let data = {};
    for (let xmlChild of xml.childNodes) {
      const name = xmlChild.nodeName.toLowerCase();
      if (xmlChild.childNodes.length > 1) {
        if (xmlChild.childNodes[0].nodeName.toLowerCase() == 'index') {
          if (!data.hasOwnProperty(name)) {
            data[name] = [];
          }
          data[name].push(self.parse(xmlChild));
        } else {
          data[name] = self.parse(xmlChild);
        }
      } else if (xmlChild.childNodes.length == 1) {
        data[name] = xmlChild.childNodes[0].nodeValue;
      } else {
        data[name] = '';
      }
    }
    return data;
  }
}

class Background {
  constructor() {
    let self = this;
    There.data.listeners.push(self);
  }

  onVariable(name, value) {
    if (name == 'hudbg') {
      $('.hud').css('--image', `url(../${value.replace('.swf', '.png')})`);
    }
  }

  onData(name, data) {
    if (name == 'hudconfig') {
      $('.right .button[data-id="alpha"]').attr('data-enabled', data.allowbgtog == 1 ? '1' : '0');
      $('.right .button[data-id="drag"]').attr('data-enabled', data.allowdrag == 1 ? '1' : '0');
    }
  }
}

There.init({
  data: {
    listeners: [],
    channels: {},
  },

  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: $('.hud').outerWidth(),
      height: $('.hud').outerHeight(),
    });

    There.fsCommand('setWidthHeight', {
      width: $('.hud').outerWidth(),
      height: $('.hud').outerHeight(),
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });

    for (let name of ['hudconfig', 'cardset', 'player', 'team', 'game', 'message', 'event']) {
      There.data.channels[name] = new Channel(name);
    };

    There.data.background = new Background();
  },

  onVariable: function(name, value) {
    if (name.startsWith('there_userdata_')) {
      const channel = There.data.channels[name.substr(15)];
      if (channel != undefined) {
        channel.xml = value;
      }
    }

    if (name == 'there_ready' && value == 1) {
    }

    for (let listener of There.data.listeners) {
      if (listener.onVariable != undefined) {
        listener.onVariable(name, value);
      }
    }
  },
});

$(document).ready(function() {
  $('.left .tabs .tab').on('mouseover', function() {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('click', function() {
    const id = $(this).attr('data-id');
    const leftDiv = $(this).parents('.left');
    $(leftDiv).find('.tab').attr('data-selected', '0');
    $(leftDiv).find('.panel').attr('data-selected', '0');
    $(leftDiv).find(`.tab[data-id="${id}"]`).attr('data-selected', '1');
    $(leftDiv).find(`.panel[data-id="${id}"]`).attr('data-selected', '1');
  });

  $('.right .button').on('mouseover', function() {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function() {
    There.playSound('control up');
  });

  $('.right .button[data-id="close"').on('click', function() {
    There.fsCommand('closeWindow');
  });

  $('.right .button[data-id="help"').on('click', function() {
    const topic = There.data.channels?.hudconfig?.data?.helptopic;
    if (topic != undefined) {
      There.guiCommand({
        action: 'helptopic',
        topic: topic,
      });
    }
  });

  $('.right .button[data-id="drag"').on('mousedown', function(event) {
    if ($(this).attr('data-enabled') == 1) {
      There.fsCommand('beginDragWindow');
      There.clearContextMenu();
      event.preventDefault();
      event.stopPropagation();
    }
  });

  $('.right .button[data-id="alpha"').on('click', function() {
    $('.hud').attr('data-alpha', (Number($('.hud').attr('data-alpha') ?? 0) + 1) % 4);
  });
});