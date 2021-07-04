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
    let self = this;
    if (name == 'hudbg') {
      $('.hud').css('--image', `url(../${value.replace('.swf', '.png')})`);
    }
  }

  onData(name, data) {
    let self = this;
    if (name == 'hudconfig') {
      $('.right .button[data-id="alpha"]').attr('data-enabled', data.allowbgtog == 1 ? '1' : '0');
      $('.right .button[data-id="drag"]').attr('data-enabled', data.allowdrag == 1 ? '1' : '0');
    }
  }
}

class Messages {
  constructor() {
    let self = this;
    self.queue = [];
    self.history = [];
    self.lastId = -1;
    self.timer = null;
    self.timestamp = null;
    self.fastTimeout = 2000;
    self.slowTimeout = 5000;
    self.messageElement = $('.message');
    self.messagesElement = $('.messages');
    There.data.listeners.push(self);
  }

  addMessage(id, text) {
    let self = this;
    text = text.trim();
    if (text == '') {
      return;
    }
    if (!text.endsWith('.') && !text.endsWith('!') && text.includes(' ')) {
      text += '.';
    }
    let index = self.queue.findIndex(e => e.id == id);
    if (index < 0) {
      if (id == 0 || id > self.lastId) {
        self.queue.push({
          id: id,
          text: text,
        });
        self.queue.sort((a, b) => a.id - b.id);
      }
    } else {
      self.queue[index].text = text;
    }
    self.displayMessage();
  }

  displayMessage() {
    let self = this;
    if (self.timestamp == null) {
      const message = self.queue.shift();
      if (message == undefined) {
        $(self.messageElement).text('');
        return;
      }
      self.lastId = message.id;
      $(self.messageElement).text(message.text);
      self.updateHistory(`** ${message.text}`);
      self.timestamp = Date.now();
      self.timer = setTimeout(function() {
        self.timer = null;
        self.timestamp = null;
        self.displayMessage();
      }, self.queue.length > 0 ? self.fastTimeout : self.slowTimeout);
    } else if (self.queue.length > 0) {
      let elapsed = Date.now() - self.timestamp;
      clearTimeout(self.timer);
      if (elapsed < self.fastTimeout) {
        self.timer = setTimeout(function() {
          self.timer = null;
          self.timestamp = null;
          self.displayMessage();
        }, self.fastTimeout - elapsed);
      } else {
        self.timer = null;
        self.timestamp = null;
        self.displayMessage();
      }
    }
  }

  updateHistory(message) {
    let self = this;
    self.history.push(message);
    while (self.history.length > 25) {
      self.history.shift();
    }
    let scroll = ($(self.messagesElement).height() - $(self.messagesElement).prop('scrollHeight') + $(self.messagesElement).prop('scrollTop'));
    $(self.messagesElement).empty();
    for (let entry of self.history) {
      $('<div/>').text(entry).appendTo($(self.messagesElement));
    }
    if (scroll >= 0) {
      self.scrollHistory(400);
    }
  }

  scrollHistory(duration) {
    let self = this;
    $(self.messagesElement).animate({
      scrollTop: $(self.messagesElement).prop('scrollHeight'),
    }, duration ?? 0);
  }

  onData(name, data) {
    let self = this;
    if (name == 'message') {
      let firstId = Number(data.firstmessage ?? -1);
      for (let message of data.message) {
        let id = Number(message.serialnum);
        if (id >= firstId) {
          self.addMessage(id, message.text);
        }
      }
    }
  }
}

class Mood {
  constructor() {
    let self = this;
    self.titles = ['Normal', 'Strong', 'Tentative'];
    self.states = self.titles.map(e => e.toLowerCase());
    self.element = $('.button[data-id="mood"]');
    $(self.element).on('click', function() {
      const oldValue = self.value;
      const newValue = (oldValue + 1) % self.states.length;
      self.value = newValue;
      There.data.messages.addMessage(0, `Your mood has changed from ${self.titles[oldValue]} to ${self.titles[newValue]}.`);
    });
  }

  get value() {
    let self = this;
    return self.states.indexOf($(self.element).attr('data-state'));
  }

  set value(value) {
    let self = this;
    $(self.element).attr('data-state', self.states[value]);
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
    There.data.messages = new Messages();
    There.data.mood = new Mood();
    There.data.game = new Game();
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

  sendEventMessageToClient: function(command, data) {
    There.fsCommand('sendEvent', Object.assign({
      command: command,
      mood: There.data.mood.value,
    }, data ?? {}));
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
    if (id == 'messages') {
      There.data.messages.scrollHistory();
    }
  });

  $('.button').on('mouseover', function() {
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
