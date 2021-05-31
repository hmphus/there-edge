let There = {
  variables: {},
  onVariable: function(name, value) {},
  isCaseSensitive: false,
};

There.fsCommand = function(command, query) {
  if (query != undefined) {
    if (query.constructor.name != 'URLSearchParams') {
      query = new URLSearchParams(query).toString();
    }
    command += '?' + query;
  }
  if (chrome.webview != undefined) {
    chrome.webview.postMessage(command);
  }
};

There.guiCommand = function(query) {
  There.fsCommand('guiCommand', query);
}

There.log = function(message) {
  There.fsCommand('Log', {
    level: 4,
    msg: message,
  });
};

There.onDragMouseDown = function() {
  if (chrome.webview != undefined) {
    chrome.webview.hostObjects.sync.client.onDragMouseDown();
  }
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

$(document).ready(function() {
  $('body').on('contextmenu', function(event) {
    return false;
  });

  if (chrome.webview != undefined) {
    window.chrome.webview.addEventListener('message', function(event) {
      const url = new URL(event.data, 'http://host/');
      if (url.pathname == '/setVariable') {
        const name = url.searchParams.get('name');
        const value = url.searchParams.get('value');
        There.variables[name.toLowerCase()] = value;
        if (There.isCaseSensitive) {
          There.onVariable(name, value);
        } else {
          There.onVariable(name.toLowerCase(), value);
        }
      }
    });
  }
});