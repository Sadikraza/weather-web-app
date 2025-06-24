// Replace with your OpenWeatherMap API key.
// It's recommended to handle API keys more securely in a production environment.
const apiKey = "Please fil your own API key"; 

let map; // Leaflet map instance
let marker; // Leaflet marker for current location
let tempChart; // Chart.js instance for temperature graph
let currentTemperatureInCelsius = true; // State to track current temperature unit

// Event listener for when the window finishes loading
window.onload = () => {
    // Check if the browser supports geolocation
    if (navigator.geolocation) {
        // Get the user's current position and call showWeatherOnMap
        navigator.geolocation.getCurrentPosition(showWeatherOnMap, geoError);
    } else {
        // Display an error message if geolocation is not supported
        displayMessage("Geolocation is not supported by this browser.");
    }
};

/**
 * Handles geolocation errors.
 * @param {GeolocationPositionError} err - The error object from geolocation.
 */
function geoError(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`);
    // Update the weather info div to show an error message
    document.getElementById("cityInput").value = ""; // Clear input on error
    document.querySelector(".city-name").textContent = "Location Error"; 
    document.querySelector(".weather-description").textContent = "Unable to access location data. Please enable location services or enter a city manually."; 
    document.getElementById("currentTemp").textContent = "--";
    document.getElementById("currentHumidity").textContent = "--";
    document.getElementById("currentWind").textContent = "--";
    // Also clear the main temperature display
    document.querySelector(".temperature").textContent = "--°C";
    if (marker) map.removeLayer(marker);
}

/**
 * Displays a custom message box.
 * @param {string} message - The message to display.
 */
function displayMessage(message) {
    const appContainer = document.querySelector('.app-container');
    let messageBox = document.querySelector('.message-box'); // Check if already exists

    if (!messageBox) { // Create if it doesn't exist
        messageBox = document.createElement('div');
        messageBox.classList.add('message-box');
        messageBox.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
                <button onclick="this.parentNode.parentNode.remove()">Close</button>
            </div>
        `;
        appContainer.appendChild(messageBox);
    } else { // Update existing message box
        messageBox.querySelector('p').textContent = message;
        messageBox.style.display = 'flex'; // Ensure it's visible
    }
}


/**
 * Initializes map and fetches weather/forecast data based on coordinates.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 */
function showWeatherOnMap(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    initMap(lat, lon);
    fetchWeatherByCoords(lat, lon);
    fetchForecast(lat, lon);
    fetchCharts(lat, lon);
}

/**
 * Initializes the Leaflet map.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 */
function initMap(lat, lon) {
    // If map already exists, just set view and update layer
    if (map) {
        map.setView([lat, lon], 10);
        // Remove existing weather tile layer if present, then re-add
        map.eachLayer(function(layer) {
            if (layer.options && layer.options.attribution && layer.options.attribution.includes("OpenWeatherMap")) {
                map.removeLayer(layer);
            }
        });
        addWeatherTile("temp_new");
    } else {
        // Initialize map for the first time
        map = L.map("map").setView([lat, lon], 10);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        addWeatherTile("temp_new");
    }
}

/**
 * Adds an OpenWeatherMap weather tile layer to the map.
 * @param {string} layer - The type of weather layer (e.g., "temp_new").
 */
function addWeatherTile(layer) {
    L.tileLayer(`https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${apiKey}`, {
        opacity: 0.5,
        attribution: 'Weather data &copy; <a href="https://openweathermap.org">OpenWeatherMap</a>'
    }).addTo(map);
}

/**
 * Fetches current weather data by coordinates and updates the HTML.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 */
function fetchWeatherByCoords(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.cod !== 200) {
                displayMessage(`Error: ${data.message || "Weather info not found for this location."}`);
                document.getElementById("cityInput").value = ""; 
                return;
            }

            document.querySelector('.city-name').textContent = data.name;
            const iconClass = getWeatherIconClass(data.weather[0].icon);
            document.querySelector('.weather-icon').className = `weather-icon fas ${iconClass}`;
            document.querySelector('.weather-description').textContent = data.weather[0].description;
            document.getElementById('currentTemp').textContent = data.main.temp.toFixed(1);
            document.getElementById('currentHumidity').textContent = `${data.main.humidity}%`;
            document.getElementById('currentWind').textContent = `${data.wind.speed} m/s`;

            currentTemperatureInCelsius = true; 
            document.querySelector('.temperature').textContent = `${data.main.temp.toFixed(1)}°C`;

            if (marker) map.removeLayer(marker);
            marker = L.marker([lat, lon]).addTo(map);
            marker.bindPopup(`${data.name}: ${data.weather[0].description}, ${data.main.temp}°C`).openPopup();
        })
        .catch(err => {
            console.error("Error fetching weather by coords:", err);
            displayMessage("Failed to fetch weather data. Please try again.");
            document.getElementById("cityInput").value = ""; 
        });
}


/**
 * Fetches weather data for a specified city name.
 */
function getWeather() {
    const city = document.getElementById("cityInput").value.trim(); // Trim whitespace
    if (!city) {
        displayMessage("Please enter a city name.");
        return;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.cod !== 200) {
                displayMessage(`City not found: ${city}. Please check the spelling.`);
                document.getElementById("cityInput").value = ""; 
                return;
            }

            const lat = data.coord.lat;
            const lon = data.coord.lon;

            initMap(lat, lon); 
            fetchWeatherByCoords(lat, lon); 
            fetchForecast(lat, lon); 
            fetchCharts(lat, lon); 
            document.getElementById("cityInput").value = ""; 
        })
        .catch(err => {
            console.error("Error fetching weather by city:", err);
            displayMessage("Failed to fetch weather data for the city. Please try again.");
            document.getElementById("cityInput").value = ""; 
        });
}

/**
 * Toggles the temperature unit between Celsius and Fahrenheit.
 */
function toggleTemperatureUnit() {
    const tempElement = document.getElementById("currentTemp"); // Small temp display
    const displayTempElement = document.querySelector(".temperature"); // Large temp display

    // Ensure elements exist before attempting to read textContent
    if (!tempElement || !displayTempElement) {
        console.error("Temperature elements not found for toggling.");
        return;
    }

    let temp = parseFloat(tempElement.textContent);

    if (currentTemperatureInCelsius) {
        temp = (temp * 9/5) + 32;
        displayTempElement.textContent = `${temp.toFixed(1)}°F`;
        tempElement.textContent = temp.toFixed(1); 
        currentTemperatureInCelsius = false;
    } else {
        temp = (temp - 32) * 5/9;
        displayTempElement.textContent = `${temp.toFixed(1)}°C`;
        tempElement.textContent = temp.toFixed(1); 
        currentTemperatureInCelsius = true;
    }
}


/**
 * Fetches 5-day forecast data and updates the HTML.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 */
function fetchForecast(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const forecastContainer = document.getElementById("forecast");
    const forecastItemsWrapper = forecastContainer.querySelector('.forecast-items-wrapper');


    fetch(url)
        .then(res => res.json())
        .then(forecastData => {
            if (forecastData.cod !== "200") {
                forecastItemsWrapper.innerHTML = "<p style='text-align: center; width: 100%; color: #f8d7da;'>Failed to load forecast data.</p>";
                console.error("Forecast API error:", forecastData.message);
                forecastContainer.querySelector('h3').style.display = 'block'; 
                return;
            }

            const dailyForecasts = {};
            forecastData.list.forEach(item => {
                const date = item.dt_txt.split(" ")[0];
                // Prioritize 12:00:00, otherwise take the first entry for the day
                if (!dailyForecasts[date] || item.dt_txt.includes("12:00:00")) {
                    dailyForecasts[date] = item;
                }
            });

            // Clear previous forecast content
            forecastItemsWrapper.innerHTML = ""; // Clear only the wrapper, keep the heading

            Object.values(dailyForecasts).slice(0, 5).forEach(day => { // Limit to 5 days
                const forecastItem = document.createElement('div');
                forecastItem.classList.add('forecast-item');
                forecastItem.innerHTML = `
                    <p><strong>${new Date(day.dt_txt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong></p>
                    <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
                    <p>${day.main.temp.toFixed(1)} °C</p>
                    <p>${day.weather[0].main}</p>
                `;
                forecastItemsWrapper.appendChild(forecastItem);
            });
            // Ensure the forecast heading is visible if it was hidden
            forecastContainer.querySelector('h3').style.display = 'block';
        })
        .catch(err => {
            console.error("Error fetching forecast:", err);
            forecastItemsWrapper.innerHTML = "<p style='text-align: center; width: 100%; color: #f8d7da;'>Failed to load forecast data.</p>";
            forecastContainer.querySelector('h3').style.display = 'block';
        });
}

/**
 * Fetches historical temperature data for charting.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 */
function fetchCharts(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    fetch(url)
        .then(res => res.json())
        .then(forecastData => {
            if (forecastData.cod !== "200") {
                console.error("Chart API error:", forecastData.message);
                // Optionally display a message on the chart canvas
                const ctx = document.getElementById("tempChart").getContext("2d");
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.fillStyle = "#fff";
                ctx.font = "16px Arial";
                ctx.fillText("Failed to load chart data.", 10, 50);
                if (tempChart) tempChart.destroy();
                return;
            }

            // Filter for data points suitable for a daily trend chart
            // Get entries approximately every 24 hours for a cleaner daily chart
            const filteredData = [];
            const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
            let lastTimestamp = 0;

            forecastData.list.forEach(item => {
                const currentTimestamp = item.dt * 1000;
                if (currentTimestamp - lastTimestamp >= oneDay || filteredData.length === 0) {
                    filteredData.push(item);
                    lastTimestamp = currentTimestamp;
                }
            });

            const labels = filteredData.map(item => {
                const date = new Date(item.dt_txt);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const temps = filteredData.map(item => item.main.temp);

            const ctx = document.getElementById("tempChart").getContext("2d");
            if (tempChart) tempChart.destroy(); // Destroy previous chart instance

            tempChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Temperature (°C)',
                        data: temps,
                        borderColor: '#FFD700', // Gold color for line
                        backgroundColor: 'rgba(255,215,0,0.3)', // Semi-transparent gold fill
                        pointBackgroundColor: '#fff', // White points
                        pointBorderColor: '#FFD700', // Gold point borders
                        pointHoverBackgroundColor: '#FFD700',
                        pointHoverBorderColor: '#fff',
                        tension: 0.4, // Smooth the line
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Allow canvas to resize freely
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                color: '#fff' // White legend text
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#FFD700',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255,255,255,0.1)' // Lighter grid lines
                            },
                            ticks: {
                                color: '#fff' // White tick labels
                            }
                        },
                        y: {
                            beginAtZero: false,
                            grid: {
                                color: 'rgba(255,255,255,0.1)'
                            },
                            ticks: {
                                color: '#fff'
                            }
                        }
                    }
                }
            });
        })
        .catch(err => {
            console.error("Error fetching chart data:", err);
            const ctx = document.getElementById("tempChart").getContext("2d");
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = "#fff";
            ctx.font = "16px Arial";
            ctx.fillText("Error: Could not load chart data.", 10, 50);
            if (tempChart) tempChart.destroy();
        });
}

// Helper function to get Font Awesome icon class based on OpenWeatherMap icon code
function getWeatherIconClass(iconCode) {
    switch (iconCode) {
        case '01d': return 'fa-sun'; // clear sky day
        case '01n': return 'fa-moon'; // clear sky night
        case '02d': case '02n': return 'fa-cloud-sun'; // few clouds
        case '03d': case '03n': return 'fa-cloud'; // scattered clouds
        case '04d': case '04n': return 'fa-cloud-meatball'; // broken clouds (or just fa-cloud)
        case '09d': case '09n': return 'fa-cloud-showers-heavy'; // shower rain
        case '10d': case '10n': return 'fa-cloud-sun-rain'; // rain
        case '11d': case '11n': return 'fa-bolt'; // thunderstorm
        case '13d': case '13n': return 'fa-snowflake'; // snow
        case '50d': case '50n': return 'fa-smog'; // mist
        default: return 'fa-question-circle'; // fallback
    }
}
