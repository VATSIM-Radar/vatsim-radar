export function buildAttributions(attribution: string | false, link: string) {
    if (!attribution) return `© <a href="/about" target="_blank">3rd Party Projects</a> © <a href="https://openweathermap.org/" target="_blank">OpenWeather</a>`;

    return `© <a href="/about" target="_blank">3rd Party Projects</a> © <a href="https://openweathermap.org/" target="_blank">OpenWeather</a> © <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> © <a href="${ link }" target="_blank">${ attribution }</a>`;
}
