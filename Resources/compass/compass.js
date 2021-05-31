$(document).ready(function() {
  $('.compass').on('mousedown', function(event) {
    There.onDragMouseDown();
    event.preventDefault();
    event.stopPropagation();
  });

  $('.compass .button[data-id="close"]').on('click', function() {
    There.fsCommand('closeWindow');
  }).on('mouseover', function(event) {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function(event) {
    There.playSound('control up');
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
      $('.compass .face').css('transform', `rotate(${-value}deg)`);
    }
  };
});