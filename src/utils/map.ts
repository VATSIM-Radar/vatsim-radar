import { isVatGlassesActive } from '~/utils/data/vatglasses';

export function buildAttributions(attribution: string | false, link: string) {
    let _attribution = `© <a href="https://openweathermap.org/" target="_blank">OpenWeather</a>`;

    if (isVatGlassesActive().value) _attribution += ` © <a href="https://github.com/lennycolton/vatglasses-data" target="_blank">VATGlasses</a>`;

    if (!attribution) return _attribution;

    return `${ _attribution } © <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> © <a href="${ link }" target="_blank">${ attribution }</a>`;
}
