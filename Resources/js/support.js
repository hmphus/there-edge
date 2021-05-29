let There = {
  variables: {},
  onVariable: function(name, value) {},
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

There.log = function(level, message) {
  There.fsCommand('Log', {
    level: level,
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
  const dataType = settings.dataType != undefined ? settings.dataType : 'xml';
  $.ajax({
    url: `http://${There.variables.There_ResourcesHost}${settings.path}?${query}`,
    dataType: dataType == 'xml' ? 'text' : dataType,
    success: function(data) {
      if (settings.success != undefined) {
        if (dataType == 'xml') {
          settings.success(new DOMParser().parseFromString(data.slice(0, -1), 'text/xml'));
        } else {
          settings.success(data);
        }
      }
    },
    error: settings.error,
  });
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
        There.variables[name] = value;
        There.onVariable(name, value);
      }
    });
  }
});