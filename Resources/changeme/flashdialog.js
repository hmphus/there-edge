There.init({
  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: 260,
      height: 192,
    });

    There.fsCommand('setWidthHeight', {
      width: 260,
      height: 192,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });
  },
});

$(document).ready(function() {
  const ids = [
    'cameracontrolhelp', 'thankyou', 'leavetreatments',
    'savelooksetchangeme', 'renamelooksetchangeme', 'deletelooksetchangeme',
    'saveoutfitchangeme', 'renameoutfitchangeme', 'deleteoutfitchangeme',
  ];

  $('.dialog').attr('data-id', ids[0]);

  $('.button[data-id="close"]').on('click', function() {
    $('.dialog').attr('data-id', ids[((ids.indexOf($('.dialog').attr('data-id'))) + 1) % ids.length]);
  });

  $('.modes .tab').on('click', function() {
   $(this).parents('.modes').attr('data-mode', $(this).attr('data-id'));
  });
});