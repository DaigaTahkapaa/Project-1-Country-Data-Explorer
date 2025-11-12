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
    render();
  } catch (e) {
    // 8) If anything goes wrong (no network, API error...), show an error.
    if (statusMessage) statusMessage.textContent = 'Failed to load countries. Please try again.';
    else console.error('Failed to load countries', e);
  }
}

// =====================================================================
// === 6. FILTERING: Apply search, region, and favourites filters ===
// has typed in the search box, the selected region, and the favourites
// toggle. Each step below is explained in plain language.
// =====================================================================
// filtered(): core filtering logic
function filtered(){
  //    Read the current search text. .trim() removes extra spaces at the
  //    start/end and .toLowerCase() makes the check case-insensitive.
  const term = q.value.trim().toLowerCase(); 

  //    Read the selected region from the dropdown. If it's an empty
  //    string the user hasn't chosen a region.
  const reg = region.value; 

  //    Start from the full list `all` and keep only countries that match
  //    both the search text and the region (if those filters are used).
  //    The filter keeps an item when both conditions are true.
  let list = all.filter(c =>
    // If the search box is empty, it is treated as "match everything".
    // Otherwise check whether the country's name contains the search term.
    (!term || c.name.toLowerCase().includes(term)) && 
    // If no region is selected, match everything; otherwise require an
    // exact region match (e.g. 'Europe').
    (!reg || c.region === reg)
  ); 

  //    If the "favourites only" toggle is on, remove any country that is
  //    not in the favourites list.
  if(showFavOnly){
    // `fav` is an object like { 'FI': true, 'SE': true } for favourited codes.
    // Using !!fav[c.code] converts whatever is stored into a simple
    // true/false value:
    //  - If fav[c.code] is true (or any truthy value) -> !! gives true
    //  - If fav[c.code] is undefined / null / 0 -> !! gives false
    // This is a short way to test "is this country favourited?".
    list = list.filter(c => !!fav[c.code]); 
  }

  //  Return the final list of countries that passed all filters.
  return list;
}

// =====================================================================
// === 7. RENDERING: Update the DOM with current filtered data ===
// Clears grid and rebuilds it from scratch - efficient for small datasets
// =====================================================================
// render(): main UI update function
function render(){
  // Get the current filtered list of countries
  const list = filtered(); 
  // Remove all existing cards
  grid.innerHTML = ""; 
  
  // If no countries match filters, show message
  if(list.length === 0){
    const p = document.createElement("p");
    p.textContent = "No matches found.";
    p.classList.add('no-matches');;
    grid.appendChild(p);
    return;
  }
  
  // For each country in filtered list, create and append a card
  list.forEach(c => grid.appendChild(card(c))); 
}

// =====================================================================
// === 8. CARD CREATION: Build a single country card element ===
// Returns a complete <article> element ready to insert into DOM
// =====================================================================
// card(c): creates one country card using the country object 'c'
function card(c){
  // Main card container - semantic <article> for accessibility
  const wrap = document.createElement("article");
  wrap.className = "card";
  wrap.setAttribute("aria-label", c.name); // Screen reader support

  // Header: country name on gradient background
  const head = document.createElement("div");
  head.className = "card-head";
  // show the country name in bold and allow CSS to control color
  head.innerHTML = `<strong class="card-title">${c.name}</strong>`;
  wrap.appendChild(head);

  // Body: flag image and details (region, capital, population)
  const body = document.createElement("div");
  body.style.padding = "10px";
  body.innerHTML = `
    <!-- Flag image wrapped so it keeps its aspect ratio -->
    <div class="flag-wrap">
      <img class="flag-img" alt="Flag of ${c.name}" src="${flagUrl(c.code)}" />
    </div>
    <!-- Country details in small text -->
    <div class="meta">
      <strong>Region:</strong> ${c.region}<br>
      <strong>Capital:</strong> ${c.capital}<br>
      <!--toLocaleString() adds commas to large numbers-->
      <strong>Population:</strong> ${c.population.toLocaleString()}
    </div>
  `;
  wrap.appendChild(body);

  // Actions: favourite button and status badge
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";
  actions.style.alignItems = "center";
  actions.style.padding = "0 10px 10px";

  // Favourite toggle button
  const btn = document.createElement("button");
  btn.type = "button";
  // Check if this country is currently favourited
  const liked = !!fav[c.code]; 
  btn.textContent = liked ? "Remove favourite" : "Add favourite";
  btn.style.cssText = "background:#fff;border:1px solid #dbe7f0;color:#0b3b58;padding:6px 10px;border-radius:8px;cursor:pointer;";
  
  // Click handler: toggle favourite status
  btn.addEventListener("click", () => {
    // If already favourited, remove it
    if(fav[c.code]) delete fav[c.code]; 
    // Otherwise, mark as favourite
    else fav[c.code] = true;
    // Save to localStorage
    saveFav(); 
    // Re-render to update button and badge
    render(); 
  });

  // Badge: visual indicator of favourite status
  const tag = document.createElement("span");
  tag.className = "badge";
  tag.textContent = liked ? "Favourite" : "Country";

  // Add button and badge to actions container
  actions.appendChild(btn);
  actions.appendChild(tag);
  // Add actions to card
  wrap.appendChild(actions);

  // Return the complete card element
  return wrap; 
}

// =====================================================================
// === 9. EVENT LISTENERS: Enable real-time interactivity ===
// These make the app respond instantly to user actions
// =====================================================================
// Live search: update results as user types
q.addEventListener("input", render); 
// Region filter: update when dropdown changes
region.addEventListener("change", render); 
// Favourites toggle: switch between all and favourites only
onlyFav.addEventListener("click", () => { 
  // Flip the boolean flag
  showFavOnly = !showFavOnly; 
  // Update button text
  onlyFav.textContent = showFavOnly ? "All countries" : "Favourites only"; 
  // Re-render with new filter
  render(); 
}); 

// =====================================================================
// === 10. INITIALIZATION: Start the application ===
// This runs immediately when the script loads
// =====================================================================
// Begin by loading country data from the API
load(); 