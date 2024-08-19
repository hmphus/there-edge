There.init({
  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: 800,
      height: 600,
    });

    There.fsCommand('setWidthHeight', {
      width: 800,
      height: 600,
    });

    There.fsCommand('setTextureBitDepth', {
      depth: 32,
    });
  },

  onVariable: function(name, value) {
    if (name == 'there_ready' && value == 1) {
      if (There.variables.there_pilotdoid == 0) {
        $('.hint').text('Welcome to There!');
      } else {
        There.fetch({
          path: '/VersionedXmlSvc/veilHints',
          query: {
            Oid: There.variables.there_pilotdoid,
          },
          dataType: 'xml',
          success: function(xml) {
            const xmlAnswer = xml.getElementsByTagName('Answer')[0];
            const xmlAvatarHints = xmlAnswer.getElementsByTagName('AvatarHints')[0];
            const xmlHint = xmlAvatarHints.getElementsByTagName('Hint')[0];
            $('.hint').text(xmlHint.childNodes[0].nodeValue);
          },
        });
      }
      if (There.isWindows()) {
        $('.teleport').attr('data-ready', '1');
      }
    }
    if (There.isMacOS()) {
      if (name == 'viewportclientareawidth' || name == 'viewportclientareaheight') {
        const width = Number(There.variables.viewportclientareawidth ?? 0);
        const height = Number(There.variables.viewportclientareaheight ?? 0);
        if (width > 0 && height > 0) {
          There.fsCommand('setWidthHeight', {
            width: width,
            height: height,
          });
          $('.teleport').attr('data-ready', '1');
        }
      }
    }
  },
});