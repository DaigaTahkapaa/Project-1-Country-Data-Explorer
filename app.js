// =====================================================================
// === 1. DOM ELEMENT REFERENCES: Connect JavaScript to HTML elements ===
// =====================================================================

//grid: container for displaying country cards
const grid = document.getElementById("grid");
//q: search input field
const q = document.getElementById("q");
//region: dropdown with hard-coded regions
const region = document.getElementById("region");
//onlyFav: button that toggles between all/favorite
const onlyFav = document.getElementById("only-fav");
//status: area for showing messages
const statusMessage = document.getElementById("status");

// =====================================================================
// === 2. STATE & PERSISTENCE: Variables and keys for data storage ===
// These hold the app's data and ensure favourites survive page reloads
// =====================================================================

//FAV_KEY: unique identifier in localStorage
const FAV_KEY = "country_favourites_v1"; 
// all: array that will hold every country after fetching from API
// NOTE: this is declared with `let` because we replace its contents later
//       (we could push into a const array, but reassigning is simpler here).
let all = [];
// fav: object where keys are country codes (e.g. "FI") and values are true
const fav = loadFav(); 
// showFavOnly: boolean flag - true means show only favourited countries
let showFavOnly = false;

// =====================================================================
// === 3. FAVOURITES: Load and save from browser's localStorage ===
// localStorage allows data to persist even after closing the browser
// =====================================================================

// loadFav(): retrieves saved favourites or returns empty object
function loadFav(){
  // localStorage.getItem() returns string or null
  // JSON.parse() converts JSON string to JavaScript object
  // try/catch prevents crash if data is corrupted
  try{
    return JSON.parse(localStorage.getItem(FAV_KEY)) || {};
  } catch {
    //if parsing gails, return empty object
    return{}
  }
}

//saveFav(): converts favorites object to JSON and saves to localStorage
function saveFav(){
    // JSON.stringify() converts object to string
      localStorage.setItem(FAV_KEY, JSON.stringify(fav)); 
}

// =====================================================================
// === 4. UTILITY: Generate flag image URL from country code ===
// Uses flagcdn.com - a reliable, free flag image service
// =====================================================================

// flagUrl(): takes 2-letter country code (e.g. "FI") and returns image URL
function flagUrl(code){
  // String(code) ensures input is string
  // .toLowerCase() makes it lowercase for URL
  // w160 = width of 160px, perfect for cards
  return `https://flagcdn.com/w160/${String(code).toLowerCase()}.png`; 
}

// =====================================================================
// === 5. DATA FETCHING: Load all countries from REST Countries API ===
// Uses modern async/await syntax for cleaner promise handling
// =====================================================================
// load(): main function that gets country data from the API and proccesses it
async function load() {
  // Show loading message while waiting for API
  statusMessage.textContent = 'Loading country data...';
  
  try {
    //    Ask the API for country data and wait until it replies.
    //    fetch() returns a Promise. await pauses until a response arrives
    //    Only ask for the fields we need (name,cca2,region,capital,population) to keep the download small.
    const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,region,capital,population');

    //   Turn the reply into a JavaScript object (this also waits).
    //   .json() parses the response body as JSON
    const data = await res.json();

    //    Make a new array with the small bits actually used.
    //    For each country from the API we create a tiny object with
    //    name, code, region, capital (string) and population.
    all = data.map(c => ({
      name: c.name.common,
      code: c.cca2,
      // 'Unknown'written if region missing
      region: c.region || 'Unknown',
  // some countries have multiple capitals (e.g. Bolivia)
  // Normalize the value so we always get a readable string:
  //  - coerce to an array (so single string or array both work) [].concat(c.capital || []) turns either a string or an array into an array safely,
  //  - remove empty/falsy entries, then join with ", ",
  //  - if nothing remains, use 'N/A' as a clear fallback.
  // This handles: [], undefined, 'City', or ['A','B'] safely.
  capital: ([].concat(c.capital || []).filter(Boolean).join(', ')) || 'N/A',
      population: c.population || 0
    }))
    // Sort the small array alphabetically so the UI looks nice.
    .sort((a, b) => a.name.localeCompare(b.name));

    // Display message og how many countries were loaded
    statusMessage.textContent = `Loaded ${all.length} countries`;
    
    // Now that data is ready, draw the page (this calls render() from other part 7. of the code).
    //render();
  } catch (e) {
    // 8) If anything goes wrong (no network, API error...), show an error.
    if (statusMessage) statusMessage.textContent = 'Failed to load countries. Please try again.';
    else console.error('Failed to load countries', e);
  }
}

// =====================================================================
// === 10. INITIALIZATION: Start the application ===
// This runs immediately when the script loads
// =====================================================================
// Begin by loading country data from the API
load(); 