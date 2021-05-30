$(document).ready(function() {
  $('.compass').on('mousedown', function(event) {
    There.onDragMouseDown();
    event.preventDefault();
    event.stopPropagation();
  });

  $('.compass .button[data-id="close"]').on('click', function() {
    There.fsCommand('closeWindow');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  There.fsCommand('setStageWidthHeight', {
    width: 86,
    height: 86,
  });

  There.fsCommand('setWidthHeight', {
    width: 86,
    height: 86,
  });

  There.fsCommand('setTextureBitDepth', {
    depth: 32,
  });

  There.onVariable = function(name, value) {
    if (name == 'there_avheading') {
      $('.compass .arrow').css('transform', `rotate(${value}deg)`);
    }
  };
});