There.init({
  data: {
    queue: [],
    isReady: false,
  },

  onVariable: function(name, value) {
    There.data.queue.push({name: name, value: value});
    if (There.data.player == undefined) {
      if (name != 'there_ready') {
        return;
      }
      const ruffle = window.RufflePlayer.newest();
      There.data.player = ruffle.createPlayer();
      There.data.player.config = {
        autoplay: 'on',
        unmuteOverlay: 'hidden',
        contextMenu: false,
        backgroundColor: '#0000',
      };
      There.data.player.onFSCommand = function(command, query) {
        There.fsCommand(command, query);
        if (There.data.isReady == false) {
          There.data.isReady = true;
          setTimeout(There.forwardRuffleVariables, 0);
        }
      };
      $('body').append(There.data.player);
      There.fsCommand('setStageWidthHeight', {
        width: $(There.data.player).innerWidth(),
        height: $(There.data.player).innerHeight(),
      });
      There.fsCommand('setWidthHeight', {
        width: $(There.data.player).innerWidth(),
        height: $(There.data.player).innerHeight(),
      });
      There.fsCommand('setTextureBitDepth', {
        depth: 32,
      });
      There.data.player.load({
        url: `http://${There.variables.there_resourceshost}/resources${$('body').attr('data-swf')}`,
        allowScriptAccess: true,
      }).then(function() {
        $('ruffle-player').attr('data-ready', '1');
      });
      return;
    }
    There.forwardRuffleVariables();
  },

  forwardRuffleVariables: function() {
    if (There.data.isReady) {
      while (There.data.queue.length > 0) {
        const entry = There.data.queue.shift();
        There.data.player.instance.set_variable(`_root.${entry.name}`, entry.value);
        if (entry.name == 'there_teleporting') {
          $('ruffle-player').attr(entry.name.replace('there_', 'data-'), entry.value);
        }
      }
    }
  },
});
