There.init({
  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: 800,
      height: 89,
    });

    There.fsCommand('setWidthHeight', {
      width: 800,
      height: 89,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });
  },

  onVariable: function(name, value) {
    There.data.queue = [];
    if (There.data.player != undefined) {
      if (There.data.player.instance != undefined) {
        There.data.player.instance.set_variable(There.keys[name], value);
      } else {
        There.data.queue.push({key: There.keys[name], value: value});
      }
    } else if (name == 'dataversion') {
      let parameters = {};
      for (let key in There.keys) {
        parameters[There.keys[key]] = There.variables[key];
      }
      const movie = $('body').data('movie');
      const ruffle = window.RufflePlayer.newest();
      There.data.player = ruffle.createPlayer();
      There.data.player.config = {
        autoplay: 'on',
        unmuteOverlay: 'hidden',
        contextMenu: false,
        backgroundColor: null,
      };
      There.data.player.onFSCommand = function(command, query) {
        if (command == 'beginDragWindow') {
          return;
        }
        There.fsCommand(command, query);
      };
      $('body').append(There.data.player);
      There.data.player.load({
        url: `http://${There.variables.there_resourceshost}/resources/sg/${movie}.swf`,
        allowScriptAccess: true,
        parameters: new URLSearchParams(There.variables).toString(),
      }).then(function() {
        while (There.data.queue.length > 0) {
          const entry = There.data.queue.shift();
          There.data.player.instance.set_variable(entry.key, entry.value);
        }
      });
    }
  },
});
