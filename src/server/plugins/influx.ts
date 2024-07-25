import { initInfluxDB } from '~/utils/backend/influx/influx';

export default defineNitroPlugin(app => {
    try {
        initInfluxDB();
    }
    catch (e) {
        console.error(e);
    }
});
