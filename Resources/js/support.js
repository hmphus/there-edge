let There = {
  variables: {},
  keys: {},
  data: {},
  isDragging: false,
  onReady: function() {},
  onVariable: function(name, value) {},
};

There.init = function(settings) {
  $('body').on('contextmenu', function(event) {
    return false;
  });
  if (settings != undefined) {
    Object.assign(There, settings);
  }
  if (window.chrome.webview != undefined) {
    window.chrome.webview.addEventListener('message', function(message) {
      const url = new URL(message.data, 'http://host/');
      if (url.pathname == '/setVariable') {
        const originalName = url.searchParams.get('name');
        const lowercaseName = originalName.toLowerCase();
        const value = url.searchParams.get('value');
        There.keys[lowercaseName] = originalName;
        There.variables[lowercaseName] = value;
        There.onVariable(lowercaseName, value);
      }
    });
  }
  $(document).on('mouseup', function(event) {
    if (There.isDragging && event.button == 0) {
      There.isDragging = false;
      There.fsCommand('endDragWindow');
    }
  });
  There.onReady();
};

There.fsCommand = function(command, query) {
  let message = command;
  if (query != undefined) {
    if (query.constructor.name != 'URLSearchParams') {
      query = new URLSearchParams(query).toString();
    }
    message += '?' + query;
  }
  if (command == 'beginDragWindow') {
    There.isDragging = true;
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

There.log = function(message) {
  There.fsCommand('Log', {
    level: 4,
    msg: message,
  });
};

There.fetch = function(settings) {
  const query = new URLSearchParams(settings.query).toString();
  $.ajax({
    url: `http://${There.variables.there_resourceshost}${settings.path}?${query}`,
    dataType: settings.dataType != undefined ? settings.dataType : 'xml',
    success: settings.success,
    error: settings.error,
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
    'system message': 4104,
    'avatar message': 4105,
  };
  const id = names[name];
  if (id != undefined) {
    There.fsCommand('PlayUISound', {
      uiSoundSelector: id,
    });
  }
};