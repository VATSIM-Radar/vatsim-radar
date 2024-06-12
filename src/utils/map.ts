export function buildAttributions(attribution: string, link: string) {
    return `© <a href="/about" target="_blank">3rd Party Projects</a> © <a href="https://openweathermap.org/" target="_blank">OpenWeather</a> © <a href="${ link }" target="_blank">${ attribution }</a>`;
}
