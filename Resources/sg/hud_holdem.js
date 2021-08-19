class CardSet {
  constructor(id, name, settings) {
    let self = this;
    self.id = id;
    self.name = name;
    self.settings = Object.assign({}, {
      offset: 0,
      sorted: true,
      selectable: false,
    }, settings ?? {});
    self.element = $(`.cardset[data-id="${self.id}"]`);
    self.cardsText = null;
    self.cardsUnsorted = [];
    self.cards = [];
    self.suits = 'shcd';
    self.ranks = 'akqjt98765432';
    There.data.listeners.push(self);
  }

  onData(name, data) {
    let self = this;
    if (name == 'cardset') {
      let cards = data.cardset.find(e => e.index == self.name)?.cards?.toLowerCase();
      if (cards != undefined && self.cardsText != cards) {
        self.cardsText = cards;
        if (cards.startsWith('#')) {
          self.cardsUnsorted = Array(Number(self.cardsText.substr(1))).fill('??');
          self.cards = self.cardsUnsorted.concat();
        } else {
          self.cardsUnsorted = self.cardsText.match(/.{1,2}/g) ?? [];
          self.cards = self.cardsUnsorted.concat();
          if (self.settings.sorted) {
            self.cards.sort(function(a, b) {
              const suitA = a[1];
              const suitB = b[1];
              if (suitA != suitB) {
                return self.suits.indexOf(suitA) - self.suits.indexOf(suitB);
              }
              const rankA = a[0];
              const rankB = b[0];
              return self.ranks.indexOf(rankA) - self.ranks.indexOf(rankB);
            });
          } else if (self.settings.offset > 0) {
            self.cards = self.cards.concat(self.cards.splice(0, self.settings.offset));
          }
        }
        $(self.element).empty();
        for (let card of self.cards) {
          let cardDiv = $('<div class="card"><span></span><span></span></div>');
          $(cardDiv).attr('data-id', card);
          $(self.element).prepend($(cardDiv));
          if (self.settings.selectable) {
            $(cardDiv).on('mouseover', function() {
              There.playSound('enabled menu item rollover');
            }).on('mousedown', function(event) {
              There.playSound('menu item activate');
            }).on('click', function() {
              There.clearNamedTimer('card-click');
              if (There.data.game.state.endsWith('send')) {
                return;
              }
              let selected = $(cardDiv).attr('data-selected');
              if (selected != 1) {
                $(self.element).find('.card').attr('data-selected', '0');
                $(cardDiv).attr('data-selected', '1');
              } else {
                There.setNamedTimer('card-click', 100, function() {
                  $(cardDiv).attr('data-selected', '0');
                });
              }
            }).on('dblclick', function() {
              There.clearNamedTimer('card-click');
              if (There.data.game.state == 'play') {
                $(cardDiv).attr('data-selected', '1');
                There.data.game.playCard($(cardDiv).attr('data-id'));
              }
            });
          }
        }
        There.data.game.clearRevertTimers();
      }
    }
  }

  get selected() {
    let self = this;
    return jQuery.map($(self.element).find('.card[data-selected="1"]'), e => $(e).attr('data-id'));
  }

  set selected(id) {
    let self = this;
    if (!self.settings.selectable) {
      return;
    }
    $(self.element).find('.card').attr('data-selected', '0');
    $(self.element).find(`.card[data-id=${id}]`).attr('data-selected', '1');
  }

  detachCard(id) {
    let self = this;
    self.cardsText = null;
    let cardDiv = $(self.element).find(`.card[data-id="${id}"]`).detach();
    $(cardDiv).off('mouseover mousedown click dblclick');
    $(cardDiv).attr('data-selected', '0');
    return cardDiv;
  }

  attachCard(cardDiv) {
    let self = this;
    self.cardsText = null;
    $(self.element).append(cardDiv);
  }
}

class Game {
  constructor() {
    let self = this;
    self.actionId = null;
    self.uiid = 1000;
    There.data.listeners.push(self);
    There.data.cardsets = {
      //hand: null,
      //players: [],
    };
  }

  onData(name, data) {
    let self = this;
    if (name == 'player' || name == 'game') {
      let playerData = There.data.channels?.player?.data;
      let gameData = There.data.channels?.game?.data;
      if (playerData != undefined && gameData != undefined) {
        self.players = playerData.player.map(function(e, i) {
          return {
            id: null,
            name: e.avname.trim(),
            prompt: e.hudprompt.trim(),
            pot: Number(e.pot),
            potWin: Number(e.potwin),
            bet: Number(e.currentbet),
            winnings: Number(e.winnings),
            chips: Number(e.chips),
            isFolded: e.folded == 1,
            inRound: e.inround == 1,
            inGame: e.ingame == 1,
          };
        });
        self.thisPlayer = playerData.player.findIndex(e => e.avoid == There.variables.there_pilotdoid);
        self.players.forEach(function(e, i) {
          e.id = ((i + self.players.length - self.thisPlayer) % self.players.length) + 1;
        });
        self.activePlayer = Number(gameData.currentplayer) - 1;
        self.setState(gameData.state.toLowerCase());
        self.isActivePlayer = (self.activePlayer == self.thisPlayer && self.thisPlayer >= 0);
        self.isDealer = (Number(gameData.dealer) - 1 == self.thisPlayer && self.thisPlayer >= 0);
        self.isHost = (Number(gameData.host) - 1 == self.thisPlayer && self.thisPlayer >= 0);
        {
          const thisPlayer = self.players[self.thisPlayer];
          self.currentBet = Number(gameData.currentbet);
          self.roundBet = Number(gameData.roundbet);
          self.raiseBet = self.currentBet + self.roundBet;
          self.playerCall = self.currentBet - thisPlayer.bet;
          self.playerRaise = self.raiseBet - thisPlayer.bet;
          self.canCall = thisPlayer.chips >= self.playerCall;
          self.canRaise = thisPlayer.chips >= self.playerRaise && (Number(gameData.maxnumraises) == 0 || Number(gameData.numraises) < Number(gameData.maxnumraises));
          self.canBlind = thisPlayer.chips >= self.roundBet;
          self.canPlayAgain = Number(gameData.maxnumrounds) == 0 || (Number(gameData.numrounds) < Number(gameData.maxnumrounds));
          $('.hud').attr('data-isactiveplayer', self.isActivePlayer ? '1' : '0');
          $('.hud').attr('data-isdealer', self.isDealer ? '1' : '0');
          $('.hud').attr('data-ishost', self.isHost ? '1' : '0');
          $('.hud').attr('data-inround', thisPlayer.inRound ? '1' : '0');
          $('.hud').attr('data-ingame', thisPlayer.inGame ? '1' : '0');
          $('.hud').attr('data-prompt', thisPlayer.prompt);
          $('.hud').attr('data-bettype', gameData.bettype == 1 ? '1' : '0');
          $('.hud').attr('data-playagain', self.canPlayAgain ? '1' : '0');
          $('.hud').attr('data-cancall', self.canCall ? '1' : '0');
          $('.hud').attr('data-canraise', self.canRaise ? '1' : '0');
          $('.hud').attr('data-canblind', self.canBlind ? '1' : '0');
          $('.left .panel[data-id="play"] .button[data-button]').attr('data-enabled', '1');
          switch (self.state) {
            case 'pregame': {
              $('.left .panel[data-id="play"] .button[data-button="f"]').attr('data-enabled', self.isHost && There.variables.restricthost != 1 ? '1' : '0');
              break;
            }
            case 'wait': {
              if (!thisPlayer.inRound) {
                if (thisPlayer.prompt.startsWith('refillstakes')) {
                  $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', thisPlayer.inGame && !thisPlayer.inRound ? '1' : '0');
                  $('.left .panel[data-id="play"] .button[data-button="b"]').attr('data-enabled', thisPlayer.inGame && !thisPlayer.inRound ? '1' : '0');
                }
                if (thisPlayer.prompt.startsWith('paystakes')) {
                  $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', thisPlayer.inGame && !thisPlayer.inRound ? '1' : '0');
                }
              } else {
                $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', '0');
              }
              break;
            }
            case 'deal': {
              if (!thisPlayer.inRound) {
                if (thisPlayer.prompt.startsWith('refillstakes')) {
                  $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', thisPlayer.inGame && !thisPlayer.inRound ? '1' : '0');
                  $('.left .panel[data-id="play"] .button[data-button="b"]').attr('data-enabled', thisPlayer.inGame && !thisPlayer.inRound ? '1' : '0');
                }
                if (thisPlayer.prompt.startsWith('paystakes')) {
                  $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', thisPlayer.inGame && !thisPlayer.inRound ? '1' : '0');
                }
              } else {
                $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', self.isDealer && self.isActivePlayer && There.variables.restrictdeal != 1 ? '1' : '0');
              }
              break;
            }
            case 'deal1': {
              $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', self.isDealer && self.isActivePlayer ? '1' : '0');
              break;
            }
            case 'deal2': {
              $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', self.isDealer && self.isActivePlayer ? '1' : '0');
              break;
            }
            case 'deal3': {
              $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', self.isDealer && self.isActivePlayer ? '1' : '0');
              break;
            }
            case 'join': {
              break;
            }
            case 'pause': {
              break;
            }
            case 'blind': {
              const amount = self.currentBet == 0 ? self.roundBet / 2 : self.roundBet;
              $('.left .panel[data-id="play"] .button[data-button="a"][data-id="blind"] .amount').data('amount', amount).text(amount.toLocaleString());
              $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              break;
            }
            case 'bet': {
              $('.left .panel[data-id="play"] .button[data-button="b"][data-id="bet"] .amount').data('amount', self.roundBet).text(self.roundBet.toLocaleString());
              $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="b"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="f"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="i"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              break;
            }
            case 'check': {
              $('.left .panel[data-id="play"] .button[data-button="b"][data-id="raise"] .amount').data('amount', self.raiseBet).text(self.raiseBet.toLocaleString());
              $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="b"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="f"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="i"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              break;
            }
            case 'call': {
              $('.left .panel[data-id="play"] .button[data-button="a"][data-id="call"] .amount').data('amount', self.currentBet).text(self.currentBet.toLocaleString());
              $('.left .panel[data-id="play"] .button[data-button="b"][data-id="raise"] .amount').data('amount', self.raiseBet).text(self.raiseBet.toLocaleString());
              $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="b"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="f"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="i"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              break;
            }
            case 'allin': {
              $('.left .panel[data-id="play"] .button[data-button="f"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="i"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              break;
            }
            case 'showdown': {
              $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="f"]').attr('data-enabled', self.isActivePlayer ? '1' : '0');
              break;
            }
            case 'endgame': {
              $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', self.isActivePlayer && self.isHost && self.canPlayAgain ? '1' : '0');
              $('.left .panel[data-id="play"] .button[data-button="f"]').attr('data-enabled', self.isHost && There.variables.restricthost != 1 ? '1' : '0');
              break;
            }
            case 'gameover': {
              $('.left .panel[data-id="play"] .button[data-button="a"]').attr('data-enabled', '0');
              $('.left .panel[data-id="play"] .button[data-button="f"]').attr('data-enabled', self.isHost && There.variables.restricthost != 1 ? '1' : '0');
              break;
            }
          }
        }
        $('.left .panel[data-id="game"] .button[data-id="newgame"]').attr('data-enabled', self.isHost && There.variables.restricthost != 1 ? '1' : '0');
        /*
        for (let player of self.players) {
          {
            let playerDiv = $(`.left .panel[data-id="tricks"] .players .player[data-player="${player.id}"]`);
            $(playerDiv).text(player.name);
          }
          {
            let tableDiv = $(`.middle .table[data-player="${player.id}"]`);
            $(tableDiv).find('.player').text(player.name);
            $(tableDiv).find('.stats span[data-id="bid"]').text(player.bid == null ? '--' : (player.bid == 0 ? 'Nil' : player.bid));
            $(tableDiv).find('.stats span[data-id="tricks"]').text(player.tricks == null ? '--' : player.tricks);
          }
        }
        if (There.data.cardsets.hand == null) {
          There.data.cardsets.hand = new CardSet('hand', `hand${self.thisPlayer + 1}`, {
            selectable: true,
          });
          self.players.forEach(function(e, i) {
            There.data.cardsets.players.push(new CardSet(`played${e.id}`, `played${i + 1}`));
          });
          self.lasttrick = new CardSet('lasttrick', 'lasttrick', {
            offset: self.thisPlayer,
            sorted: false,
          });
          if (There.data.channels?.cardset?.data != undefined) {
            There.data.channels.cardset.notify();
          }
        }
        */
        self.showIndicators();
      }
    }
    if (name == 'event') {
      for (let event of data.event) {
        const url = new URL(There.data.channels.event.data.event[0].query, 'http://host/');
        if (url.pathname.toLowerCase() == '/uirej') {
          if (url.searchParams.get('uiid') == self.uiid && url.searchParams.get('avoid') == There.variables.there_pilotdoid) {
            if (self.actionId != null) {
              self.revertPlayAction();
            }
          }
        }
      }
    }
  }

  setState(state) {
    let self = this;
    if (self.state == state) {
      return;
    }
    if (state == 'endgame' && self.state == undefined) {
      There.playSound('cards game over');
    }
    self.state = state;
    $('.hud').attr('data-gamestate', self.state);
    self.resetIndicators();
    self.clearRevertTimers();
  }

  resetIndicators() {
    let self = this;
    self.blinkCount = 0;
    self.clearIndicators();
  }

  clearIndicators() {
    let self = this;
    $('.left .panel[data-id="game"] .button').attr('data-highlighted', '0');
    $('.left .panel[data-id="play"] .button[data-button]').attr('data-highlighted', '0');
    //$('.middle .table .turn').attr('data-visible', '0');
    //$('.cardset[data-id^="played"]').attr('data-highlighted', '0');
  }

  showIndicators() {
    let self = this;
    let duration = 0;
    let isBlink = false;
    if (self.isActivePlayer && self.state != 'playsend') {
      if (self.blinkCount % 2 == 0) {
        duration = 2000;
        isBlink = false;
      } else {
        duration = 150;
        isBlink = true;
        if (self.blinkCount < 6 || self.blinkCount % 10 == 5) {
          There.playSound('cards your turn')
        }
      }
      self.blinkCount++;
    }
    self.clearIndicators();
    if (self.activePlayer >= 0) {
      const activePlayer = self.players[self.activePlayer];
      const thisPlayer = self.players[self.thisPlayer];
      switch (self.state) {
        case 'pregame': {
          break;
        }
        case 'wait': {
          if (isBlink) {
            if (!thisPlayer.inRound) {
              if (thisPlayer.prompt.startsWith('refillstakes')) {
                $('.left .panel[data-id="play"] .button[data-button="a"]:not([data-enabled="0"])').attr('data-highlighted', '1');
                $('.left .panel[data-id="play"] .button[data-button="b"]:not([data-enabled="0"])').attr('data-highlighted', '1');
              }
              if (thisPlayer.prompt.startsWith('paystakes')) {
                $('.left .panel[data-id="play"] .button[data-button="a"]:not([data-enabled="0"])').attr('data-highlighted', '1');
              }
            }
          } else {
            //$(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'deal': {
          if (isBlink) {
            if (!thisPlayer.inRound) {
              if (thisPlayer.prompt.startsWith('refillstakes')) {
                $('.left .panel[data-id="play"] .button[data-button="a"]:not([data-enabled="0"])').attr('data-highlighted', '1');
                $('.left .panel[data-id="play"] .button[data-button="b"]:not([data-enabled="0"])').attr('data-highlighted', '1');
              }
              if (thisPlayer.prompt.startsWith('paystakes')) {
                $('.left .panel[data-id="play"] .button[data-button="a"]:not([data-enabled="0"])').attr('data-highlighted', '1');
              }
            } else {
              $('.left .panel[data-id="play"] .button[data-button="a"]:not([data-enabled="0"])').attr('data-highlighted', '1');
            }
          } else {
            //$(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
        case 'endgame': {
          break;
        }
        case 'gameover': {
          break;
        }
        default: {
          if (isBlink) {
            $('.left .panel[data-id="play"] .button[data-button="a"]:not([data-enabled="0"])').attr('data-highlighted', '1');
            $('.left .panel[data-id="play"] .button[data-button="b"]:not([data-enabled="0"])').attr('data-highlighted', '1');
            $('.left .panel[data-id="play"] .button[data-button="i"]:not([data-enabled="0"])').attr('data-highlighted', '1');
          } else {
            //$(`.middle .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
          }
          break;
        }
      }
    }
    if (duration == 0) {
      There.clearNamedTimer('turn-indicator');
    } else {
      There.setNamedTimer('turn-indicator', duration, function() {
        self.showIndicators();
      });
    }
  }

  clearRevertTimers() {
    let self = this;
    There.clearNamedTimer('action-play');
    self.actionId = null;
  }

  playAction(button, command, data) {
    let self = this;
    if (self.actionId != null) {
      return;
    }
    self.actionId = $(button).attr('data-button');
    self.uiid++;
    $(button).attr('data-enabled', '0');
    There.sendEventMessageToClient(command, Object.assign({}, {
      uiid: self.uiid,
    }, data ?? {}));
    There.setNamedTimer('action-play', 5000, function() {
      self.revertPlayAction();
    });
  }

  revertPlayAction() {
    let self = this;
    if (self.actionId == null) {
      return;
    }
    There.data.channels.game.notify();
    self.actionId = null;
  }

  onVariable(name, value) {
    let self = this;
    if (self.ruffle == undefined) {
      self.ruffle = {
        queue: [],
        player: null,
        isReady: false,
      };
      //There.fsCommand('devtools');
      for (let key in There.variables) {
        self.ruffle.queue.push({
          name: key,
          value: There.variables[key],
        });
      }
    }
    self.ruffle.queue.push({
      name: name,
      value: value,
    });
    if (self.ruffle.player == null) {
      if (name != 'dataversion') {
        return;
      }
      const ruffle = window.RufflePlayer.newest();
      self.ruffle.player = ruffle.createPlayer();
      self.ruffle.player.config = {
        autoplay: 'on',
        unmuteOverlay: 'hidden',
        contextMenu: false,
      };
      self.ruffle.player.onFSCommand = function(command, query) {
        if (command == 'setTextureBitDepth' || command == 'setStageWidthHeight' || command == 'setWidthHeight' || command == 'beginDragWindow') {
          return;
        }
        There.fsCommand(command, query);
        if (self.ruffle.isReady == false) {
          self.ruffle.isReady = true;
          setTimeout(function() {
            self.forwardRuffleVariables();
          }, 0);
        }
      };
      $('.middle').append(self.ruffle.player);
      self.ruffle.player.load({
        url: `http://${There.variables.there_resourceshost}/resources/sg/ak_texasholdem_hud.swf`,
        allowScriptAccess: true,
      });
      return;
    }
    self.forwardRuffleVariables();
  }

  forwardRuffleVariables() {
    let self = this;
    if (self.ruffle.isReady) {
      while (self.ruffle.queue.length > 0) {
        const entry = self.ruffle.queue.shift();
        self.ruffle.player.instance.set_variable(`_root.${entry.name}`, entry.value);
      }
    }
  }
}

$(document).ready(function() {
  $('.left .panel[data-id="game"] .button[data-id="newgame"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(1);
  });

  $('.left .panel[data-id="game"] .button[data-id="rules"]').on('click', function() {
    const rulesPath = There.data.channels?.hudconfig?.data?.rulesurl;
    if (rulesPath != undefined) {
      There.guiCommand({
        action: 'browse',
        url: `https://${There.variables.there_webapps}${rulesPath}`,
      });
    }
  });

  $('.left .panel[data-id="game"] .button[data-id="options"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(9, {
      action: 106,
    });
  });

  $('.left .panel[data-id="game"] .button[data-id="profile"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(9, {
      action: 104,
    });
  });

  $('.left .panel[data-id="play"] .button[data-id="continuestakes"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.playAction(this, 15);
  });

  $('.left .panel[data-id="play"] .button[data-id^="agreetostakes"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.playAction(this, 13);
  });

  $('.left .panel[data-id="play"] .button[data-id^="deal"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(2);
  });

  $('.left .panel[data-id="play"] .button[data-id="blind"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(10);
  });

  $('.left .panel[data-id="play"] .button[data-id="check"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(6);
  });

  $('.left .panel[data-id="play"] .button[data-id="call"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(7);
  });

  $('.left .panel[data-id="play"] .button[data-id="showcards"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(11);
  });

  $('.left .panel[data-id="play"] .button[data-id^="playagain"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(12);
  });

  $('.left .panel[data-id="play"] .button[data-id="goin"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.playAction(this, 9, {
      action: 108,
    });
  });

  $('.left .panel[data-id="play"] .button[data-id="goout"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.playAction(this, 9, {
      action: 109,
    });
  });

  $('.left .panel[data-id="play"] .button[data-id="bet"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(5, {
      action: $(this).data('amount'),
    });
  });

  $('.left .panel[data-id="play"] .button[data-id="betnolimit"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    //this.doBetAmount("setup","Bet");
  });

  $('.left .panel[data-id="play"] .button[data-id="raise"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(8, {
      action: $(this).data('amount'),
    });
  });

  $('.left .panel[data-id="play"] .button[data-id="raisenolimit"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    //this.doBetAmount("setup","Raise");
  });

  $('.left .panel[data-id="play"] .button[data-id="buychips"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(9, {
      action: 107,
    });
  });

  $('.left .panel[data-id="play"] .button[data-id="allin"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(4);
  });

  $('.left .panel[data-id="play"] .button[data-id="fold"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    //this.doFoldButtonClick();
  });

  $('.left .panel[data-id="play"] .button[data-id="newgame"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(1);
  });
});

