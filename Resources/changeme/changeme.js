There.init({
  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: 200,
      height: 354,
    });

    There.fsCommand('setWidthHeight', {
      width: 200,
      height: 354,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });
  },
});

$(document).ready(function() {
  $('.titlebar .buttons .button[data-id="bar"]').on('click', function() {
    $('.changeme').attr('data-state', 'bar');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="full"]').on('click', function() {
    $('.changeme').attr('data-state', 'full');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="help"]').on('click', function() {
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="close"]').on('click', function() {
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.sections .section .tab').on('click', function() {
    const section = $(this).parent().data('section');
    $('.changeme').attr('data-section', section);
    if (section == 'wardrobe') {
      $('.changeme').attr('data-area', 'hairstyles');
    }
    if (section == 'body') {
      $('.changeme').attr('data-area', 'head');
    }
  });

  $('.areas .area').on('click', function() {
    $('.changeme').attr('data-area', $(this).data('area'));
    $('.sections .section[data-section="wardrobe"] .panel .title').text($(this).data('title'));
    if ($(this).data('area') == 'tops') {
      $('.sections .section[data-section="wardrobe"] .panel').attr('data-count', '8');
    } else {
      $('.sections .section[data-section="wardrobe"] .panel').attr('data-count', '0');
    }
  });

  $('.footer .button[data-id="save"]').on('click', function() {
  });

  $('.footer .button[data-id="shop"]').on('click', function() {
  });

  $('.footer .button[data-id="organize"]').on('click', function() {
  });

  $('.titlebar').on('mousedown', function(event) {
    There.fsCommand('beginDragWindow');
    event.preventDefault();
    event.stopPropagation();
  });
});