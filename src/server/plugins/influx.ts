import { initInfluxDB } from '~/utils/backend/influx';

export default defineNitroPlugin(app => {
    initInfluxDB();
});
