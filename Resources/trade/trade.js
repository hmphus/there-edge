There.init({
  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: 375,
      height: 260,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });

    new ResizeObserver(function(entries) {
      const rect = entries[0].contentRect;
      There.fsCommand('setWidthHeight', {
        width: rect.width,
        height: rect.height,
      });
    }).observe($('.trade')[0]);
  },

  onVariable: function(name, value) {
    if (name == 'there_teleporting') {
      $('.trade').attr(name.replace('there_', 'data-'), value);
    }

    if (name == 'there_ready' && value == 1) {
    }
  },
});

$(document).ready(function() {
  $('.titlebar').on('mousedown', function(event) {
    There.fsCommand('beginDragWindow');
    event.preventDefault();
    event.stopPropagation();
  });

  $('.titlebar .button').on('mouseover', function() {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function() {
    There.playSound('control up');
  });

  $('.footer .button').on('mouseover', function() {
    There.playSound('save button');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function() {
    There.playSound('control up');
  });

  $('.titlebar .buttons .button[data-id="bar"]').on('click', function() {
    $('.trade').attr('data-state', 'bar');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="full"]').on('click', function() {
    $('.trade').attr('data-state', 'full');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="help"]').on('click', function() {
    There.fsCommand('browser', {
      target: 'There_Help',
      urlGen: 'HelpTradeUrl',
    });
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="close"]').on('click', function() {
    There.fsCommand('changeState', {
      AvatarState: 5,
    });
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });
});