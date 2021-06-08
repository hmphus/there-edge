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
  },
});