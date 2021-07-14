let There = {
  variables: {},
  keys: {},
  data: {},
  onReady: function() {},
  onVariable: function(name, value) {},
  private: {
    queue: [],
    timers: {},
    intervals: {},
    isReady: false,
    isDragging: false,
  },
};

There.init = function(settings) {
  if (settings != undefined) {
    Object.assign(There, settings);
  }
  if (window.chrome.webview != undefined) {
    window.chrome.webview.addEventListener('message', function(message) {
      const url = new URL(message.data, 'http://host/');
      if (url.pathname == '/setVariable') {
        const name = url.searchParams.get('name');
        const value = url.searchParams.get('value');
        if (There.private.isReady) {
          There.processVariable(name, value);
        } else {
          There.private.queue.push({
            type: 'variable',
            name: name,
            value: value,
          });
        }
      }
    });
  }
  $(document).ready(function() {
    $('body').on('contextmenu', function(event) {
      return false;
    });
    There.private.isReady = true;
    There.onReady();
    There.processQueue();
  });
};

There.processQueue = function() {
  while (There.private.queue.length > 0) {
    const entry = There.private.queue.shift();
    if (entry.type == 'variable') {
      There.processVariable(entry.name, entry.value);
    }
  }
};

There.processVariable = function(name, value) {
  const lowercaseName = name.toLowerCase();
  There.keys[lowercaseName] = name;
  There.variables[lowercaseName] = value;
  There.onVariable(lowercaseName, value);
};

There.fsCommand = function(command, query) {
  let message = command;
  if (query != undefined) {
    if (query.constructor.name != 'URLSearchParams' && query.constructor.name != 'String') {
      query = new URLSearchParams(query).toString();
    }
    message += '?' + query;
  }
  if (command == 'beginDragWindow') {
    There.private.isDragging = true;
    if (window.chrome.webview != undefined) {
      window.chrome.webview.hostObjects.sync.client.onBeginDragWindow();
    }
    return;
  }
  if (window.chrome.webview != undefined) {
    window.chrome.webview.postMessage(message);
  }
};

There.guiCommand = function(query) {
  if (query.constructor.name == 'String') {
    query = {action: query};
  }
  There.fsCommand('guiCommand', query);
};

There.log = function(level, message) {
  if (level.constructor.name == 'String' && message == undefined) {
    message = level;
    level = 4;
  }
  There.fsCommand('Log', {
    level: level,
    msg: message + '\n',
  });
};

There.fetch = function(settings) {
  const query = new URLSearchParams(settings.query).toString();
  $.ajax({
    url: `http://${There.variables.there_resourceshost}${settings.path}?${query}`,
    dataType: settings.dataType != undefined ? settings.dataType : 'xml',
    success: settings.success,
    error: settings.error,
    complete: settings.complete,
  });
};

There.fetchAsync = async function(settings) {
  return new Promise(function(resolve) {
    There.fetch(Object.assign({}, settings, {
      complete: async function(xhr, status) {
        if (settings.complete != undefined) {
          await settings.complete(xhr, status);
        }
        resolve(status);
      },
    }));
  });
};

There.playSound = function(name) {
  const names = {
    'dialog appear': 0,
    'open menu': 1,
    'close menu': 2,
    'enabled menu item rollover': 3,
    'disabled menu item rollover': 4,
    'menu item activate': 5,
    'control rollover': 6,
    'control down': 7,
    'control up': 8,
    'control change': 9,
    'permission denied': 4096,
    'save button': 4101,
    'undo button': 4102,
    'typing backspace': 8192,
    'typing crlf': 8193,
    'typing any character': 8194,
    'message recieved': 4103,
    'message received': 4103,
    'system message': 4104,
    'avatar message': 4105,
    'system message one': 4108,
    'avatar message one': 4109,
    'cards game over': 12288,
    'cards new hand': 12289,
    'cards lose trick': 12290,
    'cards take trick': 12291,
    'cards your turn': 12292,
  };
  const id = typeof(name) == 'string' ? names[name.replaceAll('_', ' ')] : name;
  if (id != undefined) {
    if (id == 4104 || id == 4105) {
      There.private.stopSoundId = id + 2;
    }
    There.fsCommand('PlayUISound', {
      uiSoundSelector: id,
    });
  }
};

There.stopSound = function() {
  if (There.private.stopSoundId != undefined) {
    There.playSound(There.private.stopSoundId);
    delete There.private.stopSoundId;
  }
};

There.setNamedTimer = function(name, timeout, callback) {
  There.clearNamedTimer(name);
  There.private.timers[name] = setTimeout(callback, timeout);
};

There.clearNamedTimer = function(name) {
  const timer = There.private.timers[name];
  if (timer != undefined) {
    clearTimeout(timer);
    delete There.private.timers[name];
  }
};

There.setNamedInterval = function(name, timeout, callback) {
  There.clearNamedInterval(name);
  There.private.intervals[name] = setInterval(callback, timeout);
};

There.clearNamedInterval = function(name) {
  const interval = There.private.intervals[name];
  if (interval != undefined) {
    clearInterval(interval);
    delete There.private.intervals[name];
  }
};