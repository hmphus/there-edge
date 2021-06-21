There.init({
  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: Number(There.variables.there_windowwidth ?? 800),
      height: 25,
    });

    There.fsCommand('setWidthHeight', {
      width: Number(There.variables.there_windowwidth ?? 800),
      height: 25,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });
  },

  onVariable: function(name, value) {
    if (name == 'there_windowwidth') {
      There.fsCommand('setStageWidthHeight', {
        width: Number(value),
        height: 25,
      });

      There.fsCommand('setWidthHeight', {
        width: Number(value),
        height: 25,
      });
    }

    if (name == 'there_thisplaceenabled' || name == 'there_instandardview' || name == 'there_inbodyview' ||
        name == 'there_aerialviewallowed' || name == 'there_emotionsflashing' || name == 'there_lastwindowavailable') {
      $('.shortcutbar').attr(name.replace('there_', 'data-'), value);
    }
  },
});

$(document).ready(function() {
  $('.shortcutbar .button').on('mouseover', function(event) {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function(event) {
    There.playSound('control up');
  });

  $('.shortcutbar .button[data-id="there"]').on('click', function() {
    There.guiCommand('thereCentral');
  });

  $('.shortcutbar .button[data-id="browser"]').on('click', function() {
    There.guiCommand('browse');
  });

  $('.shortcutbar .button[data-id="im"]').on('click', function() {
    There.guiCommand('im');
  });

  $('.shortcutbar .button[data-id="actions"]').on('click', function() {
    There.guiCommand('emotions');
  });

  $('.shortcutbar .button[data-id="happening"]').on('click', function() {
    There.guiCommand('happeningNow');
  });

  $('.shortcutbar .button[data-id="activities"]').on('click', function() {
    There.guiCommand('activities');
  });

  $('.shortcutbar .button[data-id="map"]').on('click', function() {
    There.guiCommand('map');
  });

  $('.shortcutbar .button[data-id="places"]').on('click', function() {
    There.guiCommand('places');
  });

  $('.shortcutbar .button[data-id="information"]').on('click', function() {
    There.guiCommand('thisPlaceInfo');
  });

  $('.shortcutbar .button[data-id="exit"]').on('click', function() {
    There.guiCommand('thisPlaceExit');
  });

  $('.shortcutbar .button[data-id="shop"]').on('click', function() {
    There.guiCommand('shop');
  });

  $('.shortcutbar .button[data-id="auctions"]').on('click', function() {
    There.guiCommand('auctions');
  });

  $('.shortcutbar .button[data-id="changeme"]').on('click', function() {
    There.guiCommand('changeMe');
  });

  $('.shortcutbar .button[data-id="organizer"]').on('click', function() {
    There.guiCommand({
      action: 'organizer',
      folder: 'gear',
    });
  });

  $('.shortcutbar .button[data-id="aerial"]').on('click', function() {
    There.guiCommand({
      action: 'setView',
      viewId: 'aerialMedium',
    });
  });

  $('.shortcutbar .button[data-id="mirror"]').on('click', function() {
    There.guiCommand({
      action: 'setView',
      viewId: 'body',
    });
  });

  $('.shortcutbar .button[data-id="standard"]').on('click', function() {
    There.guiCommand({
      action: 'setView',
      viewId: 'standard',
    });
  });

  $('.shortcutbar .button[data-id="topics"]').on('click', function() {
      There.guiCommand('help');
  });

  $('.shortcutbar .button[data-id="guide"]').on('click', function() {
      There.guiCommand('guide');
  });

  $('.shortcutbar .button[data-id="help"]').on('click', function() {
    There.fsCommand('browser', {
      target: 'There_Help',
      urlGen: 'HelpShortcutBarUrl',
    });
  });

  $('.shortcutbar .button[data-id="close"]').on('click', function() {
    There.fsCommand('closeWindow');
  });
});