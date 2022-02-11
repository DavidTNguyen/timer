const pageParameters = new URLSearchParams(window.location.search)

/* ----------------------------------------
 * GET TIMER TYPE
 * ----------------------------------------
 */
const TIME_TIMER_GRADIENT = "gradient"
const TIME_TIMER_STATIC = "static"

/**
 * parses `style` param and tries to determine which timer type to use
 * @returns
 */
function getTimerType() {
  switch (pageParameters.get("style")) {
    case TIME_TIMER_STATIC: return TIME_TIMER_STATIC
    case TIME_TIMER_GRADIENT:
    default: return TIME_TIMER_GRADIENT
  }
}
const TIMER_TYPE = getTimerType()


/**
 * Gets a value that can be either a URL parameter or in localStorage
 * @param {string} name - the key of the value
 * @param {string} defaultValue - a default to return if not present in either the URL or localStorage
 * @returns {string} the param value
 */
function getCachedParam(name, defaultValue){
  return pageParameters.get(name) || localStorage.getItem(name) || defaultValue
}
/* ----------------------------------------
 * COLOR OVERRIDES
 * ----------------------------------------
 */
// Solid Colors
const COLOR_SOLID = getCachedParam("color_static", "#00FF7F")

// Gradient Colors
const GRADIENT_COLOR_100 = getCachedParam("color_gradient_100", "#00FF7F")
const GRADIENT_COLOR_75 = getCachedParam("color_gradient_75", "#3BCA6D")
const GRADIENT_COLOR_50 = getCachedParam("color_gradient_50", "#77945C")
const GRADIENT_COLOR_25 = getCachedParam("color_gradient_25", "#B25F4A")
const GRADIENT_COLOR_0 = getCachedParam("color_gradient_0", "#ED2938")

// Global Config
const BACKGROUND_COLOR = getCachedParam("color_bg", "transparent")
const FONT_COLOR = getCachedParam("color_font", "#FFFFFF")
const FONT_SHADOW_COLOR = getCachedParam("color_font_shadow", "black")

/* ----------------------------------------
 * TIMING
 * ----------------------------------------
 */
const DURATION_PARAM = pageParameters.get('d') || pageParameters.get('duration')
const TIME_PARAM = pageParameters.get('t') || pageParameters.get('time')
const SECONDS_PARAM = pageParameters.get("seconds")
/**
 * checks if `d` or `duration` is set and if so, parses it into seconds else
 * checks if `seconds` param is given and parses that
 * @returns {number} number of seconds
 * @defaultValue 60
 */
function calcTimerSeconds() {
  let timerSeconds = 60
  const durParser = new RegExp(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/)
  const timeParser = new RegExp(/^(\d+):?(\d+)?(AM|PM)/)

  if (TIME_PARAM && timeParser.test(TIME_PARAM.toUpperCase())) {
    const parsed = timeParser.exec(TIME_PARAM.toUpperCase())
    console.debug('calcTimerSeconds', 'time parsed', parsed)
    const hourParse = Number.parseInt(parsed[1])
    const minutes = parsed[2] ? Number.parseInt(parsed[2]) : 0
    const now = new Date()
    const hours = hourParse + (parsed[3] === 'AM' ? 0 : 12) - (hourParse === 12 ? 12 : 0)
    console.log('new Date', now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0)
    const future = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0)
    timerSeconds = (future.getTime() - now.getTime()) / 1000
  }
  else if (DURATION_PARAM && durParser.test(DURATION_PARAM)) {
    const parsed = durParser.exec(DURATION_PARAM)
    console.debug('calcTimerSeconds', 'dur parsed', parsed)
    timerSeconds = 0
    if (parsed[1]) timerSeconds += parseInt(parsed[1]) * 3600
    if (parsed[2]) timerSeconds += parseInt(parsed[2]) * 60
    if (parsed[3]) timerSeconds += parseInt(parsed[3])
  } else if (SECONDS_PARAM) {
    timerSeconds = parseInt(SECONDS_PARAM)
  }

  console.debug('calcTimerSeconds', 'return (timerSeconds)', timerSeconds)
  return timerSeconds
}

const TIMER_SECONDS = calcTimerSeconds()
const START_TIME = new Date().getTime()
const END_TIME = START_TIME + (TIMER_SECONDS * 1000)
console.debug('Start time', START_TIME)
console.debug('End time', END_TIME)

/* ----------------------------------------
 * FORMAT
 * ----------------------------------------
 */
/**
 * formatTime
 *
 * Translates seconds to `Hours:Minutes:Seconds` format
 * @param {number} seconds the number of seconds left in the timer
 * @returns {string} formatted string
 */
const formatTime = (seconds) => {
  if (seconds >= 3600) {
    return new Date(seconds * 1000)
      .toISOString()
      .substr(11, 8)
      .replace(/^0+/, "")
  }
  if (seconds < 60) {
    return new Date(seconds * 1000)
      .toISOString()
      .substr(17, 2)
      .replace(/^0+/, "")
  }
  return new Date(seconds * 1000)
    .toISOString()
    .substr(14, 5)
    .replace(/^0+/, "")
}

/* ----------------------------------------
 * TIMER STYLES
 * ----------------------------------------
 */
/**
 * adds in CSS styles to the head of the document
 * useful for dynamic CSS
 * @param {string} styles stylesheet as string
 */
function addCSS(styles) {
  var head = document.getElementsByTagName('head')[0]
  var s = document.createElement('style')
  var css = styles
  s.setAttribute('type', 'text/css')
  s.appendChild(document.createTextNode(css))
  head.appendChild(s)
}

/**
 * determines the timer type and then injects CSS to tell circle to use the
 * correct animation style with calculated timer seconds
 */
function addTimerCSS() {
  let animation

  switch (TIMER_TYPE) {
    case TIME_TIMER_STATIC:
      animation = 'time-timer-solid'
      break
    case TIME_TIMER_GRADIENT:
      animation = 'time-timer-gradient'
      break
  }

  var css = `
#circle {
  animation: ${animation} ${TIMER_SECONDS}s linear;
}
`
  addCSS(css)
}

const TIME_UP_MESSAGE = getCachedParam("time_up_message", "Time's Up!")
/**
 * sets the text inside `#label` with either the time left or if the timer is up, the timeUpMessage
 * @param {number} currentSeconds
 */
const updateTimerText = (currentSeconds) => {
  document.getElementById("label").innerHTML = currentSeconds > 0 ? `${formatTime(currentSeconds)}` : TIME_UP_MESSAGE
}


/* ----------------------------------------
 * START / RUN
 * ----------------------------------------
 */
// updateTimer will call out to the different styled timers
// to ask them to redraw on the HTML canvas. Defaults to time timer.
function updateTimer() {
  const secondsLeft = Math.ceil((END_TIME - new Date().getTime()) / 1000)
  console.debug('updateTimer', 'secondsLeft', secondsLeft, formatTime(secondsLeft))
  updateTimerText(secondsLeft)
}

/**
 * Call update immediately since the interval will only trigger
 * after the initial delay of 1000ms. This whole block is just
 * to call the update timer function every second and stop the interval
 * after the timer has expired.
 */
(function startTimer() {
  // add CSS variables for all overrides
  addCSS(`:root {
    --gradient-color-100: ${GRADIENT_COLOR_100};
    --gradient-color-75: ${GRADIENT_COLOR_75};
    --gradient-color-50: ${GRADIENT_COLOR_50};
    --gradient-color-25: ${GRADIENT_COLOR_25};
    --gradient-color-0: ${GRADIENT_COLOR_0};

    --color-solid: ${COLOR_SOLID};

    --background-color: ${BACKGROUND_COLOR};
    --font-color: ${FONT_COLOR};
    --font-shadow-color: ${FONT_SHADOW_COLOR};
  }`)

  addTimerCSS() // add CSS specific for given timer

  updateTimer() // first update

  // update every subsequent second
  let timerInterval = setInterval(function() {
    updateTimer()
    if (new Date().getTime() > END_TIME) {
      clearInterval(timerInterval)
      console.log("Timer done!")
    }
  }, 1000)
})()
