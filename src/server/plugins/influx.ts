import { initInfluxDB } from '~/utils/backend/influx/influx';

export default defineNitroPlugin(app => {
    initInfluxDB();
});
