class VolumeSlider {
  constructor(element, callback) {
    let self = this;
    self.element = element;
    self.knob = $(self.element).find('.knob');
    self.width = $(self.element).width();
    let item = $(self.element).closest('.item');
    self.id = $(item).attr('data-id');
    self.name = $(item).attr('data-name');
    self.value = 0;
    self.refresh();
    self.callback = callback;
    self.active = false;
    $(self.knob).on('mousedown', function(event) {
      if (event.which == 1) {
        self.active = true;
        self.offsetX = event.pageX - $(self.knob).position().left;
      }
    });
    $(document).on('mousemove', function(event) {
      if (self.active) {
        $(self.knob).css({
          left: Math.min(Math.max(0, event.pageX - self.offsetX), self.width),
        });
      }
    }).on('mouseup', function() {
      if (self.active) {
        self.active = false;
        self.obtainValue();
        self.callback(self);
      }
    });
    $(self.element).on('mousedown', function(event) {
      if (event.which == 1 && !self.active) {
        $(self.knob).animate({
          left: Math.min(Math.max(0, event.offsetX - 5), self.width),
        }, 200, 'swing', function() {
          self.obtainValue();
          self.callback(self);
        });
      }
    });
  }

  setValue(value) {
    let self = this;
    self.value = value;
    self.refresh();
  }

  obtainValue() {
    let self = this;
    self.value = $(self.knob).position().left / self.width;
  }

  refresh() {
    let self = this;
    $(self.knob).css({
      left: self.value * self.width,
    });
  }
}

There.init({
  data: {
    sliders: {},
  },

  onReady: function() {
    There.fsCommand('setStageWidthHeight', {
      width: 128,
      height: 176,
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
    }).observe($('.volume')[0]);

    $('.slider').each(function(index, element) {
      const slider = new VolumeSlider(element, function(slider) {
        There.guiCommand({
          action: 'setpreference',
          pref: slider.name,
          value: slider.value,
        });
      });
      There.data.sliders[slider.id] = slider;
    });
  },

  onVariable: function(name, value) {
    if (name == 'there_teleporting') {
      $('.volume').attr(name.replace('there_', 'data-'), value);
    }

    switch (name) {
      case 'there_voiceenabled': {
        $('.panel .item[data-id="voice"]').attr('data-enabled', value);
        break;
      }
      case 'there_musicenabled': {
        $('.panel .item[data-id="music"]').attr('data-enabled', value);
        break;
      }
      case 'there_muteallsound': {
        $('.footer .button[data-id="mute"]').attr('data-engaged', value);
        break;
      }
      case 'there_voicevolume': {
        There.data.sliders.voice.setValue(Number(value));
        break;
      }
      case 'there_musicvolume': {
        There.data.sliders.music.setValue(Number(value));
        break;
      }
      case 'there_environmentvolume': {
        There.data.sliders.environment.setValue(Number(value));
        break;
      }
    }
  },
});

$(document).ready(function() {
  $('.titlebar').on('mousedown', function(event) {
    if (event.which == 1) {
      There.fsCommand('beginDragWindow');
    }
    There.clearContextMenu();
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

  $('.slider').on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  });

  $('.slider .knob').on('mouseover', function() {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function() {
    There.playSound('control up');
  });

  $('.footer .button').on('mouseover', function() {
    There.playSound('control rollover');
  }).on('mousedown', function(event) {
    There.playSound('control down');
    event.stopPropagation();
  }).on('mouseup', function() {
    There.playSound('control up');
  });

  $('.titlebar .buttons .button[data-id="bar"]').on('click', function() {
    $('.volume').attr('data-state', 'bar');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="full"]').on('click', function() {
    $('.volume').attr('data-state', 'full');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.titlebar .buttons .button[data-id="close"]').on('click', function() {
    There.fsCommand('closeWindow');
  }).on('mousedown', function(event) {
    event.stopPropagation();
  });

  $('.footer .button[data-id="mute"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.guiCommand({
      action: 'togglepreference',
      pref: 'MuteAllSound',
    });
  });
});