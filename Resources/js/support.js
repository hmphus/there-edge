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