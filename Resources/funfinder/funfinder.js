There.init({
  onReady: function() {
    There.fsCommand('declareToolbar');

    There.fsCommand('setStageWidthHeight', {
      width: Number(There.variables.there_windowwidth || 800),
      height: 36,
    });

    There.fsCommand('setWidthHeight', {
      width: Number(There.variables.there_windowwidth || 800),
      height: 36,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });
  },

  onVariable: function(name, value) {
    if (name == 'there_windowwidth') {
      There.fsCommand('setStageWidthHeight', {
        width: Number(value),
        height: 36,
      });

      There.fsCommand('setWidthHeight', {
        width: Number(value),
        height: 36,
      });
    }
  },
});

$(document).ready(function() {
  $('.funfinder .button').on('mouseover', function(event) {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function(event) {
    There.playSound('control up');
  });

  $('.funfinder .button[data-id="events"]').on('click', function() {
    There.guiCommand('happeningNow');
  });

  $('.funfinder .button[data-id="chats"]').on('click', function() {
    There.guiCommand('conversations');
  });

  $('.funfinder .button[data-id="clubs"]').on('click', function() {
    There.guiCommand('clubs');
  });

  $('.funfinder .button[data-id="map"]').on('click', function() {
    There.guiCommand('map');
  });

  $('.funfinder .button[data-id="shop"]').on('click', function() {
    There.guiCommand('shop');
  });

  $('.funfinder .button[data-id="guide"]').on('click', function() {
    There.guiCommand('guide');
  });

  $('.funfinder .button[data-id="help"]').on('click', function() {
    There.fsCommand('browser', {
      target: 'There_Help',
      urlGen: 'HelpFunFinderUrl',
    });
  });

  $('.funfinder .button[data-id="close"]').on('click', function() {
    There.fsCommand('closeWindow');
  });
});