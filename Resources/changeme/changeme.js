$(document).ready(function() {
  $('.areas .area').on('click', function() {
    $('.areas').attr('data-area', $(this).data('area'));
    $('.tabs .wardrobe .listing .title').text($(this).data('title'));
    if ($(this).data('area') == 'tops') {
      $('.tabs .wardrobe .listing .list .item').show();
    } else {
      $('.tabs .wardrobe .listing .list .item').hide();
    }
  });

  $('.tabs .tab').on('click', function() {
    $('.changeme').attr('data-tab', $(this).data('tab'));
    $('.tabs').attr('data-tab', $(this).data('tab'));
  });

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

  $('.footer .button[data-id="save"]').on('click', function() {
  });

  $('.footer .button[data-id="shop"]').on('click', function() {
  });

  $('.footer .button[data-id="organize"]').on('click', function() {
  });

  $('.titlebar').on('mousedown', function(event) {
    if (chrome.webview != undefined) {
      chrome.webview.hostObjects.sync.client.onDragMouseDown();
    }
    event.preventDefault();
    event.stopPropagation();
  });

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
});