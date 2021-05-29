$(document).ready(function() {
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

  There.onVariable = function(name, value) {
    if (name == 'There_Ready' && value == '1') {
      There.fetch({
        path: '/VersionedXmlSvc/veilHints',
        query: {
          Oid: There.variables.There_PilotDoid,
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
  };
});