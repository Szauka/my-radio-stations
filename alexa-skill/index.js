/*
 * My Radio – Alexa skill for streaming internet radio stations
 * Paste this into lambda/index.js in the Alexa-hosted "Code" tab.
 *
 * IMPORTANT: every stream URL must be HTTPS with a valid certificate.
 * Plain http:// streams will NOT play on Alexa.
 * Supported formats: MP3, AAC/MP4, HLS (.m3u8), PLS, M3U.
 */
const Alexa = require('ask-sdk-core');

// ---------------------------------------------------------------------------
// 1. YOUR STATION LIST
//    'id' must match the slot value ID in interaction-model.json (STATION_NAME).
//    'art' is optional; shown on the Echo Show screen (HTTPS image).
//    'aliases' are just a reminder here – the spoken variants Alexa actually
//    recognises are the synonyms in interaction-model.json.
// ---------------------------------------------------------------------------
// Google-hosted Noto "radio" emoji, 512x512 PNG. Swap for any HTTPS PNG/JPG you like.
const GENERIC_RADIO_ART = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4fb/512.png';

// Your own logos: push PNG/JPG files to the 'logos' folder of the
// Szauka/my-radio-stations GitHub repo (the repo must be public), then set a
// station's art to e.g.  art: ART_BASE + 'kiss.png'
const ART_BASE = 'https://cdn.jsdelivr.net/gh/Szauka/my-radio-stations@main/logos/';

const STATIONS = [
  { id: 1,  name: 'Magic FM',       url: 'https://live.magicfm.ro/magicfm.aacp',                              aliases: ['magic', 'magic radio'], art: GENERIC_RADIO_ART },
  { id: 2,  name: 'Reper',          url: 'https://stream.clever-host.ro/8014/stream',                         aliases: [],                       art: GENERIC_RADIO_ART },
  { id: 3,  name: 'Zu',             url: 'https://live4ro.antenaplay.ro/radiozu/16837/seg48000-33672091.aac', aliases: ['radio zu'],            art: GENERIC_RADIO_ART },
  { id: 4,  name: 'Kiss FM',        url: 'https://live.kissfm.ro/kissfm.aacp',                                aliases: ['kiss'],                 art: GENERIC_RADIO_ART },
  { id: 5,  name: 'West City',      url: 'https://live.westcityradio.ro:8000/aac',                            aliases: ['west city radio'],      art: GENERIC_RADIO_ART },
  { id: 6,  name: 'Digi FM',        url: 'https://edge76.rdsnet.ro:84/digifm/digifm.mp3',                     aliases: ['digi'],                 art: GENERIC_RADIO_ART },
  { id: 7,  name: 'Etno Vest',      url: 'https://ssl.radios.show/8020/stream',                               aliases: ['etno'],                 art: GENERIC_RADIO_ART },
  { id: 8,  name: 'Realitatea',     url: 'https://shout.realitatea.net:8001/mixt',                            aliases: ['realitatea fm'],        art: GENERIC_RADIO_ART },
  { id: 9,  name: 'Digi 24',        url: 'https://edge76.rcs-rds.ro/digifm/digi24fm.mp3',                     aliases: ['digi twenty four'],     art: GENERIC_RADIO_ART },
  { id: 10, name: 'Doza Colinde',   url: 'https://colinde.radiodoza.eu:8146/stream',                          aliases: ['doza de colinde'],      art: GENERIC_RADIO_ART },
  { id: 11, name: 'Play Colinde',   url: 'https://mscp1.gazduireradio.ro:9292/stream',                        aliases: [],                       art: GENERIC_RADIO_ART },
  { id: 12, name: 'Ardeal Colinde', url: 'https://cloud.radiosonicpanel.ro/7877/stream',                      aliases: ['colinde ardeal'],       art: GENERIC_RADIO_ART },
  { id: 13, name: 'Nasu Romeo',     url: 'https://asculta.muzicaok.de/radionasuromeo/stream',                 aliases: [],                       art: GENERIC_RADIO_ART },
  { id: 14, name: 'Disco Mix',      url: 'https://play.discomix.ro/8002/stream',                              aliases: [],                       art: GENERIC_RADIO_ART }
];

const BACKGROUND = ''; // optional HTTPS background image for the Echo Show, 1024x640

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function findIndexById(id) {
  return STATIONS.findIndex(s => String(s.id) === String(id));
}

// The token of the currently loaded stream is the station id.
function currentIndex(handlerInput) {
  const ap = handlerInput.requestEnvelope.context.AudioPlayer;
  const idx = ap && ap.token ? findIndexById(ap.token) : -1;
  return idx >= 0 ? idx : 0;
}

function play(handlerInput, index, speech) {
  const n = STATIONS.length;
  const station = STATIONS[((index % n) + n) % n];
  const metadata = { title: station.name, subtitle: 'Live radio' };
  if (station.art) metadata.art = { sources: [{ url: station.art }] };
  if (BACKGROUND) metadata.backgroundImage = { sources: [{ url: BACKGROUND }] };
  const rb = handlerInput.responseBuilder
    .addAudioPlayerPlayDirective('REPLACE_ALL', station.url, String(station.id), 0, undefined, metadata)
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
// AudioPlayer lifecycle events – acknowledge with an empty response.
// ---------------------------------------------------------------------------
const AudioPlayerEventHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope).startsWith('AudioPlayer.'),
  handle(h) {
    const type = Alexa.getRequestType(h.requestEnvelope);
    if (type === 'AudioPlayer.PlaybackFailed') {
      console.log('Playback failed:', JSON.stringify(h.requestEnvelope.request.error));
    }
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
    AudioPlayerEventHandler,
    SessionEndedHandler,
    SystemExceptionHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
