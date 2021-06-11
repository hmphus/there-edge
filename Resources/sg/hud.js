There.init({
  data: {
    queue: [],
    isReady: false,
  },

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
    There.data.queue.push({name: name, value: value});
    if (There.data.player == undefined) {
      if (name != 'dataversion') {
        return;
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
        if (There.data.isReady == false) {
          There.data.isReady = true;
          setTimeout(There.forwardHudVariables, 0);
        }
      };
      $('body').append(There.data.player);
      There.data.player.load({
        url: `http://${There.variables.there_resourceshost}/resources/sg/${movie}.swf`,
        allowScriptAccess: true,
      }).then(function() {
        $('ruffle-player').attr('data-ready', '1');
      });
      return;
    }
    There.forwardHudVariables();
  },

  forwardHudVariables: function() {
    if (There.data.isReady) {
      while (There.data.queue.length > 0) {
        const entry = There.data.queue.shift();
        There.data.player.instance.set_variable(`_root.${entry.name}`, entry.value);
      }
    }
  },
});
