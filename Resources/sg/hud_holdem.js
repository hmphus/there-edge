class CardSet {
  constructor(id, name, settings) {
    let self = this;
    self.id = id;
    self.name = name;
    self.settings = Object.assign({}, {
      count: 0,
    }, settings ?? {});
    self.element = $(`.cardset[data-id="${self.id}"]`);
    self.cardsText = null;
    self.cards = [];
    There.data.listeners.push(self);
  }

  onData(name, data) {
    let self = this;
    if (name == 'cardset') {
      let cards = data.cardset.find(e => e.index == self.name)?.cards?.toLowerCase();
      if (cards != undefined && self.cardsText != cards) {
        self.cardsText = cards;
        if (cards.startsWith('#')) {
          self.cards = Array(Number(self.cardsText.substr(1))).fill('??');
        } else {
          self.cards = self.cardsText.match(/.{1,2}/g) ?? [];
        }
        while (self.cards.length < self.settings.count) {
          self.cards.push('--');
        }
        $(self.element).empty();
        for (let card of self.cards) {
          let cardDiv = $('<div class="card"><span></span><span></span></div>');
          $(cardDiv).attr('data-id', card);
          $(self.element).prepend($(cardDiv));
        }
        There.data.game.clearRevertTimers();
      }
    }
  }
}

class Game {
  constructor() {
    let self = this;
    self.actionId = null;
    self.uiid = 1000;
    There.data.listeners.push(self);
    There.data.cardsets = {
      spot: null,
      hand: null,
      players: [],
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
            prompt: e.hudprompt == null ? '' : e.hudprompt.trim().toLowerCase(),
            lastPlay: e.lastplay == null ? '' : e.lastplay.trim().toLowerCase(),
            pot: Number(e.pot),
            potWin: Number(e.potwin),
            bet: Number(e.currentbet),
            winnings: Number(e.winnings),
            chips: Number(e.chips),
            isFolded: e.folded == 1,
            inRound: e.inround == 1,
            inGame: e.ingame == 1,
            inSeat: e.avoid > 0,
            isLeader: Number(gameData.leader) - 1 == i,
            isHost: Number(gameData.host) - 1 == i,
          };
        });
        self.thisPlayer = playerData.player.findIndex(e => e.avoid == There.variables.there_pilotdoid);
        self.players.forEach(function(e, i) {
          e.id = ((i + self.players.length - self.thisPlayer) % self.players.length) + 1;
        });
        const thisPlayer = self.players[self.thisPlayer];
        self.activePlayer = Number(gameData.currentplayer) - 1;
        self.setState(gameData.state.toLowerCase());
        self.isActivePlayer = (self.activePlayer == self.thisPlayer && self.thisPlayer >= 0);
        self.isDealer = (Number(gameData.dealer) - 1 == self.thisPlayer && self.thisPlayer >= 0);
        self.isHost = (Number(gameData.host) - 1 == self.thisPlayer && self.thisPlayer >= 0);
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
        $('.hud').attr('data-confirm', '');
        $('.hud').attr('data-playercount', gameData.maxnumplayers);
        $('.left .panel[data-id="play"] .button[data-button]').attr('data-enabled', '1');
        switch (self.state) {
          case 'pregame': {
            $('.left .panel[data-id="play"] .button[data-button="f"]').attr('data-enabled', self.isHost && There.variables.restricthost != 1 ? '1' : '0');
            break;
          }
          case "showprompt": {
            if (self.isActivePlayer) {
              $('.hud').attr('data-confirm', 'showprompt');
            }
            break;
          }
          case 'wait': {
            $('.left .tabs .tab[data-id="play"]').trigger('click');
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
            $('.left .tabs .tab[data-id="play"]').trigger('click');
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
        $('.left .panel[data-id="game"] .button[data-id="newgame"]').attr('data-enabled', self.isHost && There.variables.restricthost != 1 ? '1' : '0');
        $('.middle .bottom .stats span[data-id="pot"]').text(Number(gameData.pot).toLocaleString());
        $('.middle .bottom .stats span[data-id="chips"]').text(thisPlayer.chips.toLocaleString());
        $('.middle .bottom .stats span[data-id="winnings"]').text(thisPlayer.winnings.toLocaleString());
        for (let player of self.players) {
          {
            const playTitles = {
              fold: 'Folded',
              bet: 'Opened',
              call: 'Called',
              check: 'Checked',
              raise: 'Raised',
              allin: 'All In',
              win: `Won ${player.potWin.toLocaleString()}`,
              win2: `Won ${player.potWin.toLocaleString()}`,
              win3: `Won ${player.potWin.toLocaleString()}`,
              deal: 'Dealt',
              blind: 'Blind',
              wait: 'Waiting',
              join: 'Joined',
              notin: 'Sat Out',
              ineligible: 'Ineligible',
              eliminated: 'Eliminated',
            };
            let tableDiv = $(`.middle .top .table[data-player="${player.id}"]`);
            $(tableDiv).attr('data-ingame', player.inGame == 1 ? '1' : '0');
            $(tableDiv).attr('data-inseat', player.inSeat == 1 ? '1' : '0');
            $(tableDiv).attr('data-play', player.lastPlay);
            $(tableDiv).find('.player').text(player.name).attr('data-leader', player.isLeader ? '1' : '0').attr('data-host', player.isHost ? '1' : '0');
            $(tableDiv).find('.play').text(playTitles[player.lastPlay] ?? '');
            $(tableDiv).find('.bet').text(self.state == 'showdown' ? (player.pot > 0 ? player.pot.toLocaleString() : '') : (player.bet > 0 ? player.bet.toLocaleString() : ''));
            $(tableDiv).find('.chips').text(player.chips > 0 ? player.chips.toLocaleString() : '');
          }
        }
        if (There.data.cardsets.spot == null) {
          There.data.cardsets.spot = new CardSet('spot', 'spot', {
            count: 5,
          });
          There.data.cardsets.hand = new CardSet('hand', `hand${self.thisPlayer + 1}`);
          self.players.forEach(function(e, i) {
            There.data.cardsets.players.push(new CardSet(`hand${e.id}`, `hand${i + 1}`));
          });
          if (There.data.channels?.cardset?.data != undefined) {
            There.data.channels.cardset.notify();
          }
        }
        self.showIndicators();
      }
    }
    if (name == 'event') {
      for (let event of data.event) {
        const url = new URL(There.data.channels.event.data.event[0].query, 'http://host/');
        if (url.pathname.toLowerCase() == '/uirej') {
          if (url.searchParams.get('uiid') == self.uiid && url.searchParams.get('avoid') == There.variables.there_pilotdoid) {
            if (self.actionId != null) {
              self.revertDoAction();
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
    $('.middle .top .table .turn').attr('data-visible', '');
  }

  showIndicators() {
    let self = this;
    let duration = 0;
    let isBlink = false;
    if (self.isActivePlayer) {
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
            $(`.middle .top .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '0');
          } else {
            $(`.middle .top .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
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
            $(`.middle .top .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '0');
          } else {
            $(`.middle .top .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
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
            $(`.middle .top .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '0');
          } else {
            $(`.middle .top .table[data-player="${activePlayer.id}"] .turn`).attr('data-visible', '1');
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
    There.clearNamedTimer('do-action');
    self.actionId = null;
  }

  doAction(button, command, data) {
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
    There.setNamedTimer('do-action', 5000, function() {
      self.revertDoAction();
    });
  }

  revertDoAction() {
    let self = this;
    if (self.actionId == null) {
      return;
    }
    There.data.channels.game.notify();
    self.actionId = null;
  }

  doFold() {
    let self = this;
    const thisPlayer = self.players[self.thisPlayer];
    if (thisPlayer.isFolded) {
      return;
    }
    $('.hud').attr('data-confirm', 'fold');
  }

  doBet() {
    let self = this;
    if (!self.isActivePlayer) {
      return;
    }
    $('.hud').attr('data-confirm', 'bet');
    $('.left .panel[data-id="play"] .layer[data-id="bet"] .amount').data('amount', self.raiseBet).text(self.raiseBet.toLocaleString());
  }

  doRaise() {
    let self = this;
    if (!self.isActivePlayer) {
      return;
    }
    $('.hud').attr('data-confirm', 'raise');
    $('.left .panel[data-id="play"] .layer[data-id="raise"] .amount').data('amount', self.raiseBet).text(self.raiseBet.toLocaleString());
  }

  doPromptYes() {
    let self = this;
    if (!self.isActivePlayer) {
      return;
    }
    There.sendEventMessageToClient(9, {
      action: 110,
    });
  }

  doPromptNo() {
    let self = this;
    if (!self.isActivePlayer) {
      return;
    }
    There.sendEventMessageToClient(9, {
      action: 111,
    });
  }

  doFoldYes() {
    let self = this;
    if (!self.isActivePlayer) {
      return;
    }
    There.sendEventMessageToClient(9, {
      action: 105,
    });
  }

  doFoldNo() {
    let self = this;
    $('.hud').attr('data-confirm', '');
  }

  doBetMinus() {
    let self = this;
    if (!self.isActivePlayer) {
      return;
    }
    let amount = $('.left .panel[data-id="play"] .layer[data-id="bet"] .amount').data('amount') - self.roundBet;
    if (amount >= self.raiseBet) {
      $('.left .panel[data-id="play"] .layer[data-id="bet"] .amount').data('amount', amount).text(amount.toLocaleString());
    }
  }

  doBetPlus() {
    let self = this;
    const thisPlayer = self.players[self.thisPlayer];
    if (!self.isActivePlayer) {
      return;
    }
    let amount = $('.left .panel[data-id="play"] .layer[data-id="bet"] .amount').data('amount') + self.roundBet;
    if (amount < thisPlayer.chips) {
      $('.left .panel[data-id="play"] .layer[data-id="bet"] .amount').data('amount', amount).text(amount.toLocaleString());
    }
  }

  doBetConfirm() {
    let self = this;
    if (!self.isActivePlayer) {
      return;
    }
    let amount = $('.left .panel[data-id="play"] .layer[data-id="bet"] .amount').data('amount');
    There.sendEventMessageToClient(5, {
      action: amount,
    });
  }

  doBetCancel() {
    let self = this;
    $('.hud').attr('data-confirm', '');
  }

  doRaiseMinus() {
    let self = this;
    if (!self.isActivePlayer) {
      return;
    }
    let amount = $('.left .panel[data-id="play"] .layer[data-id="raise"] .amount').data('amount') - self.roundBet;
    if (amount >= self.raiseBet) {
      $('.left .panel[data-id="play"] .layer[data-id="raise"] .amount').data('amount', amount).text(amount.toLocaleString());
    }
  }

  doRaisePlus() {
    let self = this;
    const thisPlayer = self.players[self.thisPlayer];
    if (!self.isActivePlayer) {
      return;
    }
    let amount = $('.left .panel[data-id="play"] .layer[data-id="raise"] .amount').data('amount') + self.roundBet;
    if (amount < thisPlayer.chips) {
      $('.left .panel[data-id="play"] .layer[data-id="raise"] .amount').data('amount', amount).text(amount.toLocaleString());
    }
  }

  doRaiseConfirm() {
    let self = this;
    if (!self.isActivePlayer) {
      return;
    }
    let amount = $('.left .panel[data-id="play"] .layer[data-id="raise"] .amount').data('amount');
    There.sendEventMessageToClient(8, {
      action: amount,
    });
  }

  doRaiseCancel() {
    let self = this;
    $('.hud').attr('data-confirm', '');
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
    There.data.game.doAction(this, 15);
  });

  $('.left .panel[data-id="play"] .button[data-id^="agreetostakes"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doAction(this, 13);
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
    There.data.game.doAction(this, 9, {
      action: 108,
    });
  });

  $('.left .panel[data-id="play"] .button[data-id="goout"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doAction(this, 9, {
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
    There.data.game.doBet();
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
    There.data.game.doRaise();
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
    There.data.game.doFold();
  });

  $('.left .panel[data-id="play"] .button[data-id="newgame"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.sendEventMessageToClient(1);
  });

  $('.left .panel[data-id="play"] .layer[data-id="showprompt"] .button[data-id="yes"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doPromptYes();
  });

  $('.left .panel[data-id="play"] .layer[data-id="showprompt"] .button[data-id="no"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doPromptNo();
  });

  $('.left .panel[data-id="play"] .layer[data-id="fold"] .button[data-id="yes"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doFoldYes();
  });

  $('.left .panel[data-id="play"] .layer[data-id="fold"] .button[data-id="no"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doFoldNo();
  });

  $('.left .panel[data-id="play"] .layer[data-id="bet"] .button[data-id="minus"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doBetMinus();
  });

  $('.left .panel[data-id="play"] .layer[data-id="bet"] .button[data-id="plus"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doBetPlus();
  });

  $('.left .panel[data-id="play"] .layer[data-id="bet"] .button[data-id="confirm"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doBetConfirm();
  });

  $('.left .panel[data-id="play"] .layer[data-id="bet"] .button[data-id="cancel"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doBetCancel();
  });

  $('.left .panel[data-id="play"] .layer[data-id="raise"] .button[data-id="minus"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doRaiseMinus();
  });

  $('.left .panel[data-id="play"] .layer[data-id="raise"] .button[data-id="plus"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doRaisePlus();
  });

  $('.left .panel[data-id="play"] .layer[data-id="raise"] .button[data-id="confirm"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doRaiseConfirm();
  });

  $('.left .panel[data-id="play"] .layer[data-id="raise"] .button[data-id="cancel"]').on('click', function() {
    if ($(this).attr('data-enabled') == 0) {
      return;
    }
    There.data.game.doRaiseCancel();
  });
});