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
    if (name == 'dataversion' && There.player == undefined) {
      let parameters = {};
      for (let key in There.keys) {
        parameters[There.keys[key]] = There.variables[key];
      }
      const movie = $('body').data('movie');
      const ruffle = window.RufflePlayer.newest();
      There.player = ruffle.createPlayer();
      There.player.config = {
        autoplay: 'on',
        unmuteOverlay: 'hidden',
        contextMenu: false,
        backgroundColor: null,
      };
      There.player.onFSCommand = function(command, query) {
        console.log(command);
        if (command == 'beginDragWindow') {
          return;
        }
        There.fsCommand(command, query);
      };
      $('body').append(There.player);
      There.player.load({
        url: `http://${There.variables.there_resourceshost}/resources/sg/${movie}.swf`,
        allowScriptAccess: true,
        parameters: new URLSearchParams(There.variables).toString(),
      });
    }
  },
});
