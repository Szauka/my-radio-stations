/*
 * My Radio – Alexa skill for streaming internet radio stations
 * Paste this into lambda/index.js in the Alexa-hosted "Code" tab.
 *
 * Alexa only plays HTTPS streams with a valid certificate on port 443.
 * Other stations (http://, or https:// on another port) are played through
 * the HTTPS relay in proxy/ – see RELAY_BASE below.
 * Supported formats: MP3, AAC/MP4, HLS (.m3u8), PLS, M3U.
 */
const Alexa = require('ask-sdk-core');

// ---------------------------------------------------------------------------
// 1. YOUR STATION LIST
//    'id' must match the slot value ID in interaction-model.json (STATION_NAME).
//    'art' (512x512 logo) and 'bg' (1024x640 background) are optional HTTPS
//    images shown on the Echo Show. Both are made by scripts/make-art.mjs.
//    'aliases' are just a reminder here – the spoken variants Alexa actually
//    recognises are the synonyms in interaction-model.json.
// ---------------------------------------------------------------------------
// Google-hosted Noto "radio" emoji, 512x512 PNG, used for a station without 'art'.
const GENERIC_RADIO_ART = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4fb/512.png';

// Your own logos: push PNG/JPG files to the 'logos' folder of the
// Szauka/my-radio-stations GitHub repo (the repo must be public), then set a
// station's art to e.g.  art: ART_BASE + 'kiss-fm.png'
const ART_BASE = 'https://cdn.jsdelivr.net/gh/Szauka/my-radio-stations@main/logos/';

const STATIONS = [
  { id: 1,  name: 'Magic FM',         url: 'https://live.magicfm.ro/magicfm.aacp',                            aliases: ['magic', 'magic radio'],                     art: ART_BASE + 'magic-fm.png', bg: ART_BASE + 'magic-fm-bg.png' },
  { id: 2,  name: 'Radio Miloș',      url: 'http://radiomilos.ro:8803/stream',                                aliases: ['milos', 'radio milos'],                     art: ART_BASE + 'radio-milos.png', bg: ART_BASE + 'radio-milos-bg.png' },
  { id: 3,  name: 'Antena Satelor',   url: 'http://stream2.srr.ro:8042/;',                                    aliases: ['antena satelor'],                           art: ART_BASE + 'antena-satelor.png', bg: ART_BASE + 'antena-satelor-bg.png' },
  { id: 4,  name: 'Reper',            url: 'https://stream.clever-host.ro/8014/stream',                       aliases: [],                                           art: ART_BASE + 'reper.png', bg: ART_BASE + 'reper-bg.png' },
  { id: 5,  name: 'National FM',      url: 'http://live3.nationalfm.ro:8001/;',                               aliases: ['national', 'nationalfm'],                   art: ART_BASE + 'national-fm.png', bg: ART_BASE + 'national-fm-bg.png' },
  { id: 6,  name: 'Zu',               url: 'https://live7digi.antenaplay.ro/radiozu/radiozu-48000.m3u8',      aliases: ['radio zu'],                                 art: ART_BASE + 'zu.png', bg: ART_BASE + 'zu-bg.png' },
  { id: 7,  name: 'Kiss FM',          url: 'https://live.kissfm.ro/kissfm.aacp',                              aliases: ['kiss'],                                     art: ART_BASE + 'kiss-fm.png', bg: ART_BASE + 'kiss-fm-bg.png' },
  { id: 8,  name: 'Europa FM',        url: 'https://astreaming.edi.ro:8443/EuropaFM_aac',                     aliases: ['europa'],                                   art: ART_BASE + 'europa-fm.png', bg: ART_BASE + 'europa-fm-bg.png' },
  { id: 9,  name: 'Pro FM',           url: 'http://edge126.rdsnet.ro:84/profm/profm.mp3',                     aliases: ['profm', 'pro'],                             art: ART_BASE + 'pro-fm.png', bg: ART_BASE + 'pro-fm-bg.png' },
  { id: 10, name: 'West City',        url: 'https://live.westcityradio.ro:8000/aac',                          aliases: ['west city radio'],                          art: ART_BASE + 'west-city.png', bg: ART_BASE + 'west-city-bg.png' },
  { id: 11, name: 'Radio Reșița',     url: 'http://stream2.srr.ro:8344/;',                                    aliases: ['resita', 'radio resita'],                   art: ART_BASE + 'radio-resita.png', bg: ART_BASE + 'radio-resita-bg.png' },
  { id: 12, name: 'Timișoara FM',     url: 'http://stream2.srr.ro:8354/',                                     aliases: ['timisoara', 'radio timisoara'],             art: ART_BASE + 'timisoara-fm.png', bg: ART_BASE + 'timisoara-fm-bg.png' },
  { id: 13, name: 'Digi FM',          url: 'http://edge76.rdsnet.ro:84/digifm/digifm.mp3',                    aliases: ['digi'],                                     art: ART_BASE + 'digi-fm.png', bg: ART_BASE + 'digi-fm-bg.png' },
  { id: 14, name: 'Actualități',      url: 'http://stream2.srr.ro:8002/;',                                    aliases: ['actualitati', 'radio romania actualitati'], art: ART_BASE + 'actualitati.png', bg: ART_BASE + 'actualitati-bg.png' },
  { id: 15, name: 'Etno Vest',        url: 'https://ssl.radios.show/8020/stream',                             aliases: ['etno'],                                     art: ART_BASE + 'etno-vest.png', bg: ART_BASE + 'etno-vest-bg.png' },
  { id: 16, name: 'Realitatea',       url: 'https://shout.realitatea.net:8001/mixt',                          aliases: ['realitatea fm'],                            art: ART_BASE + 'realitatea.png', bg: ART_BASE + 'realitatea-bg.png' },
  { id: 17, name: 'Trinitas',         url: 'https://live.radiotrinitas.ro:8003/;stream.nsv',                  aliases: ['radio trinitas'],                           art: ART_BASE + 'trinitas.png', bg: ART_BASE + 'trinitas-bg.png' },
  { id: 18, name: 'Digi 24',          url: 'https://edge76.rcs-rds.ro/digifm/digi24fm.mp3',                   aliases: ['digi twenty four'],                         art: ART_BASE + 'digi-24.png', bg: ART_BASE + 'digi-24-bg.png' },
  { id: 19, name: 'Doza Colinde',     url: 'https://colinde.radiodoza.eu:8146/stream',                        aliases: ['doza de colinde'],                          art: ART_BASE + 'doza-colinde.png', bg: ART_BASE + 'doza-colinde-bg.png' },
  { id: 20, name: 'Play Colinde',     url: 'http://mscp1.gazduireradio.ro:9292/stream',                       aliases: [],                                           art: ART_BASE + 'play-colinde.png', bg: ART_BASE + 'play-colinde-bg.png' },
  { id: 21, name: 'Ardeal Colinde',   url: 'https://cloud.radiosonicpanel.ro/7877/stream',                    aliases: ['colinde ardeal'],                           art: ART_BASE + 'ardeal-colinde.png', bg: ART_BASE + 'ardeal-colinde-bg.png' },
  { id: 22, name: 'Nasu Romeo',       url: 'https://asculta.muzicaok.de/radionasuromeo/stream',               aliases: [],                                           art: ART_BASE + 'nasu-romeo.png', bg: ART_BASE + 'nasu-romeo-bg.png' },
  { id: 23, name: 'Disco Mix',        url: 'https://play.discomix.ro/8002/stream',                            aliases: [],                                           art: ART_BASE + 'disco-mix.png', bg: ART_BASE + 'disco-mix-bg.png' },
  { id: 24, name: 'Banat Timișoara',  url: 'http://live.radiobanatfm.com:8002/;',                             aliases: ['radio banat', 'banat'],                     art: ART_BASE + 'banat-timisoara.png', bg: ART_BASE + 'banat-timisoara-bg.png' },
  { id: 25, name: 'Radio Popular',    url: 'http://livemp3.radiopopular.ro:7777/;',                           aliases: ['popular'],                                  art: ART_BASE + 'radio-popular.png', bg: ART_BASE + 'radio-popular-bg.png' }
];

const BACKGROUND = ''; // optional fallback background for stations without 'bg', 1024x640

// HTTPS relay for streams Alexa can't play directly (see proxy/README.md).
// Alexa only plays HTTPS on the standard port 443, so plain http:// streams and
// https:// streams on other ports (e.g. :8000, :8443) go through the relay.
// Same value as RELAY_BASE in src/stations.ts.
const RELAY_BASE = 'https://my-radio-relay.szaukad.workers.dev';

function streamUrl(station) {
  const u = new URL(station.url);
  return u.protocol === 'https:' && !u.port ? station.url : `${RELAY_BASE}/s/${station.id}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function findIndexById(id) {
  return STATIONS.findIndex(s => String(s.id) === String(id));
}

// A stream's token is the station id, plus "~N" after N stations in a row
// failed and were skipped (e.g. "6~1"). Alexa hands the token back with every
// playback event, so this is how the skill remembers without a database.
const MAX_SKIPS = 3;

function parseToken(token) {
  const [id, skips] = String(token || '').split('~');
  return { index: findIndexById(id), skips: Number(skips) || 0 };
}

function currentIndex(handlerInput) {
  const ap = handlerInput.requestEnvelope.context.AudioPlayer;
  const idx = ap && ap.token ? parseToken(ap.token).index : -1;
  return idx >= 0 ? idx : 0;
}

function play(handlerInput, index, speech, skips = 0) {
  const n = STATIONS.length;
  const station = STATIONS[((index % n) + n) % n];
  const metadata = { title: station.name, subtitle: 'Live radio' };
  metadata.art = { sources: [{ url: station.art || GENERIC_RADIO_ART }] };
  const background = station.bg || BACKGROUND;
  if (background) metadata.backgroundImage = { sources: [{ url: background }] };
  const rb = handlerInput.responseBuilder
    .addAudioPlayerPlayDirective('REPLACE_ALL', streamUrl(station), skips ? `${station.id}~${skips}` : String(station.id), 0, undefined, metadata)
    .withShouldEndSession(true);
  if (speech) rb.speak(speech);
  return rb.getResponse();
}

function stop(handlerInput, speech) {
  const rb = handlerInput.responseBuilder.addAudioPlayerStopDirective().withShouldEndSession(true);
  if (speech) rb.speak(speech);
  return rb.getResponse();
}

function stationListSpeech() {
  const names = STATIONS.map(s => s.name);
  const last = names.pop();
  return names.length ? `${names.join(', ')} and ${last}` : last;
}

function isIntent(handlerInput, ...names) {
  return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
    names.includes(Alexa.getIntentName(handlerInput.requestEnvelope));
}

// ---------------------------------------------------------------------------
// Voice handlers
// ---------------------------------------------------------------------------
const LaunchHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest',
  handle(h) {
    const speech = `Welcome to My Radio. Which station would you like? For example, ${STATIONS[0].name} or ${STATIONS[3].name}. Say list stations to hear them all.`;
    return h.responseBuilder.speak(speech).reprompt('Which station would you like?').getResponse();
  }
};

const PlayStationHandler = {
  canHandle: h => isIntent(h, 'PlayStationIntent'),
  handle(h) {
    const slot = Alexa.getSlot(h.requestEnvelope, 'station');
    const res = slot && slot.resolutions && slot.resolutions.resolutionsPerAuthority &&
      slot.resolutions.resolutionsPerAuthority[0];
    if (res && res.status.code === 'ER_SUCCESS_MATCH') {
      const idx = findIndexById(res.values[0].value.id);
      if (idx >= 0) return play(h, idx, `Playing ${STATIONS[idx].name}`);
    }
    return h.responseBuilder
      .speak(`Sorry, I don't know that station. Say list stations to hear them all.`)
      .reprompt('Which station would you like?')
      .getResponse();
  }
};

const ListStationsHandler = {
  canHandle: h => isIntent(h, 'ListStationsIntent'),
  handle(h) {
    return h.responseBuilder
      .speak(`Your stations are ${stationListSpeech()}. Which one would you like?`)
      .reprompt('Which station would you like?')
      .getResponse();
  }
};

const NextHandler = {
  canHandle: h => isIntent(h, 'AMAZON.NextIntent'),
  handle: h => play(h, currentIndex(h) + 1)
};

const PreviousHandler = {
  canHandle: h => isIntent(h, 'AMAZON.PreviousIntent'),
  handle: h => play(h, currentIndex(h) - 1)
};

// Live radio can't really "resume from position", so we restart the stream.
const ResumeHandler = {
  canHandle: h => isIntent(h, 'AMAZON.ResumeIntent', 'AMAZON.StartOverIntent', 'AMAZON.RepeatIntent'),
  handle: h => play(h, currentIndex(h))
};

const PauseStopHandler = {
  canHandle: h => isIntent(h, 'AMAZON.PauseIntent', 'AMAZON.StopIntent', 'AMAZON.CancelIntent', 'AMAZON.NavigateHomeIntent'),
  handle: h => stop(h)
};

const UnsupportedHandler = {
  canHandle: h => isIntent(h, 'AMAZON.LoopOnIntent', 'AMAZON.LoopOffIntent',
    'AMAZON.ShuffleOnIntent', 'AMAZON.ShuffleOffIntent'),
  handle: h => h.responseBuilder.speak("That's not available for live radio.").getResponse()
};

const HelpHandler = {
  canHandle: h => isIntent(h, 'AMAZON.HelpIntent'),
  handle(h) {
    return h.responseBuilder
      .speak(`Say the name of a station, like ${STATIONS[0].name}. You can also say next, previous or stop. Which station would you like?`)
      .reprompt('Which station would you like?')
      .getResponse();
  }
};

const FallbackHandler = {
  canHandle: h => isIntent(h, 'AMAZON.FallbackIntent'),
  handle(h) {
    return h.responseBuilder
      .speak(`Sorry, I didn't catch that. Say a station name, or say list stations.`)
      .reprompt('Which station would you like?')
      .getResponse();
  }
};

// ---------------------------------------------------------------------------
// Echo Show touch buttons / remote controls (PlaybackController)
// These must NOT include speech.
// ---------------------------------------------------------------------------
const PlaybackControllerHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope).startsWith('PlaybackController.'),
  handle(h) {
    const type = Alexa.getRequestType(h.requestEnvelope);
    const idx = currentIndex(h);
    switch (type) {
      case 'PlaybackController.PlayCommandIssued': return play(h, idx);
      case 'PlaybackController.NextCommandIssued': return play(h, idx + 1);
      case 'PlaybackController.PreviousCommandIssued': return play(h, idx - 1);
      case 'PlaybackController.PauseCommandIssued': return stop(h);
      default: return h.responseBuilder.getResponse();
    }
  }
};

// ---------------------------------------------------------------------------
// A station that fails to play (offline, moved, relay error) is skipped: the
// next station starts instead. After MAX_SKIPS failures in a row it stops, so
// a network outage doesn't cycle through every station. No speech is allowed
// in a response to an AudioPlayer event, so the switch is silent.
// ---------------------------------------------------------------------------
const PlaybackFailedHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'AudioPlayer.PlaybackFailed',
  handle(h) {
    const request = h.requestEnvelope.request;
    const { index, skips } = parseToken(request.token);
    const failed = index >= 0 ? STATIONS[index].name : request.token;
    console.log(`Playback failed for ${failed}:`, JSON.stringify(request.error));
    if (index < 0 || skips + 1 > MAX_SKIPS) {
      console.log('Not skipping: too many failures in a row.');
      return h.responseBuilder.getResponse();
    }
    const next = STATIONS[(index + 1) % STATIONS.length].name;
    console.log(`Skipping to ${next}.`);
    return play(h, index + 1, undefined, skips + 1);
  }
};

// ---------------------------------------------------------------------------
// Other AudioPlayer lifecycle events – acknowledge with an empty response.
// ---------------------------------------------------------------------------
const AudioPlayerEventHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope).startsWith('AudioPlayer.'),
  handle(h) {
    return h.responseBuilder.getResponse();
  }
};

const SessionEndedHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest',
  handle: h => h.responseBuilder.getResponse()
};

const SystemExceptionHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'System.ExceptionEncountered',
  handle(h) {
    console.log('System exception:', JSON.stringify(h.requestEnvelope.request.error));
    return h.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle: () => true,
  handle(h, error) {
    console.log('Error:', error.stack || error);
    return h.responseBuilder.speak('Sorry, something went wrong.').getResponse();
  }
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchHandler,
    PlayStationHandler,
    ListStationsHandler,
    NextHandler,
    PreviousHandler,
    ResumeHandler,
    PauseStopHandler,
    UnsupportedHandler,
    HelpHandler,
    FallbackHandler,
    PlaybackControllerHandler,
    PlaybackFailedHandler,
    AudioPlayerEventHandler,
    SessionEndedHandler,
    SystemExceptionHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
