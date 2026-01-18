import { initInfluxDB } from '~/utils/server/influx/influx';

export default defineNitroPlugin(app => {
    initInfluxDB();
});
